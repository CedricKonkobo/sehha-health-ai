<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Ordonnance SEHHA</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #1f2937; }
        .header { border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #059669; margin: 0; font-size: 24px; }
        .header p { margin: 5px 0; color: #6b7280; font-size: 12px; }
        .info-grid { display: table; width: 100%; margin-bottom: 20px; }
        .info-row { display: table-row; }
        .info-cell { display: table-cell; padding: 8px 0; width: 50%; }
        .label { font-weight: bold; color: #374151; }
        .medicaments { margin: 20px 0; }
        .medicament { background: #f9fafb; border-left: 4px solid #059669; padding: 12px; margin: 8px 0; }
        .qr-section { margin-top: 40px; text-align: center; border-top: 1px dashed #d1d5db; padding-top: 20px; }
        .qr-code { margin: 10px auto; text-align: center; }
        .qr-code img { display: inline-block; }
        .footer { margin-top: 40px; font-size: 10px; color: #9ca3af; text-align: center; }
        .alert { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; margin: 10px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SEHHA — Ordonnance Numérique</h1>
        <p>Clinique Polyvalente Ibn Tofail - Kénitra</p>
        <p>Document électronique sécurisé - Valide 3 mois</p>
    </div>

    <div class="info-grid">
        <div class="info-row">
            <div class="info-cell">
                <span class="label">Médecin:</span> Dr. {{ preg_replace('/^\s*(Dr\.?|Docteur)\s+/i', '', $doctor->name) }}<br>
                <span class="label">Spécialité:</span> {{ ucfirst(str_replace('_', ' ', $doctor->doctorProfile?->speciality ?? 'Médecine Générale')) }}<br>
                <span class="label">Date:</span> {{ $document->issued_at?->format('d/m/Y') ?? now()->format('d/m/Y') }}
            </div>
            <div class="info-cell">
                <span class="label">Patient:</span> {{ $patient->name }}<br>
                <span class="label">CIN:</span> {{ $cin_patient ?? 'N/A' }}<br>
                <span class="label">N° Ordonnance:</span> {{ $document->uuid }}
            </div>
        </div>
    </div>

    @if(!empty($medicaments))
    <div class="medicaments">
        <h3 style="color: #059669;">Médicaments prescrits</h3>
        @foreach($medicaments as $med)
        <div class="medicament">
            <strong>{{ $med['nom'] ?? 'Médicament' }}</strong> - {{ $med['posologie'] ?? '' }}<br>
            <small>Durée: {{ $med['duree'] ?? 'Selon prescription' }}</small>
        </div>
        @endforeach
    </div>
    @endif

    <div class="qr-section">
        <p><strong>Vérification d'authenticité</strong></p>
        <div class="qr-code">
            <img src="{{ $qrCodeBase64 }}" alt="QR Code de vérification">
        </div>
        <p style="font-size: 11px;">Scannez ce QR code pour vérifier l'authenticité de l'ordonnance</p>
        <p style="font-size: 10px; color: #6b7280;">Hash: {{ substr($qr_hash, 0, 16) }}...</p>
    </div>

    <div class="footer">
        <p>SEHHA - Plateforme IA Hospitalière Intégrée</p>
        <p>Ce document est généré électroniquement et est valide sans signature manuscrite.</p>
        <p>Conforme à la Loi 09-08 sur la protection des données personnelles au Maroc.</p>
    </div>
</body>
</html>