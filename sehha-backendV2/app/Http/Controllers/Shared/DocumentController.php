<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Models\MedicalDocument;
use App\Services\DocumentIngestionService;
use App\Services\SpeechToTextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function __construct(
        private DocumentIngestionService $ingestion,
        private SpeechToTextService $stt
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = MedicalDocument::with(['patient', 'creator']);

        if ($user->role === 'patient') {
            $query->where('patient_id', $user->id)
                  ->where('visible_to_patient', true);
        } elseif ($user->role === 'medecin') {
            $query->where(function ($q) use ($user) {
                $q->where('created_by', $user->id)
                  ->orWhereHas('patient', fn ($p) => $p->where('id', $user->id));
            });
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        $documents = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data'    => $documents->map(fn ($d) => [
                'uuid'         => $d->uuid,
                'type'         => $d->type,
                'title'        => $d->title,
                'issued_at'    => $d->issued_at?->format('Y-m-d'),
                'expires_at'   => $d->expires_at?->format('Y-m-d'),
                'status'       => $d->status,
                'source'       => $d->source,
                'patient_name' => $d->patient->name,
                'created_by'   => $d->creator->name,
            ]),
            'meta' => ['timestamp' => now()->toIso8601String()],
        ]);
    }

    public function show(Request $request, string $uuid): JsonResponse|\Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $document = MedicalDocument::where('uuid', $uuid)->firstOrFail();
        Gate::authorize('view', $document);

        if ($request->has('download')) {
            if (!Storage::exists($document->storage_path)) {
                return response()->json([
                    'success' => false,
                    'error'   => ['code' => 'NOT_FOUND', 'message' => 'Fichier non trouvé.'],
                    'meta'    => ['timestamp' => now()->toIso8601String()],
                ], 404);
            }
            return response()->download(
                Storage::path($document->storage_path),
                $document->title . ($document->type === 'ordonnance' ? '.pdf' : '.jpg')
            );
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'uuid'               => $document->uuid,
                'type'               => $document->type,
                'title'              => $document->title,
                'issued_at'          => $document->issued_at?->format('Y-m-d'),
                'expires_at'         => $document->expires_at?->format('Y-m-d'),
                'status'             => $document->status,
                'source'             => $document->source,
                'structured_data'    => $document->structured_data,
                'extracted_text'     => $document->extracted_text,
                'ai_summary'         => $document->ai_summary,
                'qr_hash'            => $document->qr_hash,
                'visible_to_patient' => $document->visible_to_patient,
            ],
            'meta' => ['timestamp' => now()->toIso8601String()],
        ]);
    }

    /**
     * Scan OCR d'un document.
     * Accepte une image en base64 (JSON) — format habituel depuis le mobile.
     */
    public function scan(Request $request): JsonResponse
    {
        $request->validate([
            'image'        => ['required', 'string'],   // base64
            'patient_uuid' => ['nullable', 'string', 'uuid'],
            'title'        => ['nullable', 'string', 'max:191'],
        ]);

        $user = $request->user();

        if ($user->role === 'patient') {
            $patient = $user;
        } else {
            if (!$request->patient_uuid) {
                return response()->json([
                    'success' => false,
                    'error'   => ['code' => 'VALIDATION_ERROR', 'message' => 'patient_uuid requis pour ce rôle.'],
                    'meta'    => ['timestamp' => now()->toIso8601String()],
                ], 422);
            }
            $patient = \App\Models\User::where('uuid', $request->patient_uuid)
                ->where('role', 'patient')->firstOrFail();
        }

        $document = $this->ingestion->ingestScannedDocument(
            imageBase64: $request->image,
            patientId:   $patient->id,
            createdById: $user->id,
            titleHint:   $request->title,
        );

        return response()->json([
            'success' => true,
            'data'    => [
                'uuid'           => $document->uuid,
                'type'           => $document->type,
                'title'          => $document->title,
                'extracted_text' => $document->extracted_text,
                'ai_summary'     => $document->ai_summary,
                'structured_data'=> $document->structured_data,
            ],
            'message' => 'Document scanné et enregistré dans le dossier médical.',
            'meta'    => ['timestamp' => now()->toIso8601String()],
        ], 201);
    }

    /**
     * Transcription vocale.
     * Accepte un fichier audio uploadé (multipart/form-data) — format web/mobile.
     * Le fichier est transmis directement au serveur Whisper sans passer par base64.
     */
    public function transcribe(Request $request): JsonResponse
    {
        $request->validate([
            'audio'    => ['required', 'file', 'mimes:wav,mp3,mp4,m4a,ogg,flac,webm', 'max:51200'], // 50 Mo
            'language' => ['nullable', 'string', 'in:fr,ar,en'],
        ]);

        /** @var \Illuminate\Http\UploadedFile $file */
        $file     = $request->file('audio');
        $language = $request->language ?? 'fr';

        $result = $this->stt->transcribe(
            input:    $file->getRealPath(),
            language: $language,
            isPath:   true,                         // chemin temporaire, pas base64
            filename: $file->getClientOriginalName() ?: 'audio.' . $file->extension(),
        );

        return response()->json([
            'success' => true,
            'data'    => $result,
            'meta'    => ['timestamp' => now()->toIso8601String()],
        ]);
    }
}