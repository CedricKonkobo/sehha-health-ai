// src/hooks/useSpeechToText.ts
import { useState, useRef, useCallback, useEffect } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useSpeechToText() {
  const [isListening, setIsListening]   = useState(false);
  const [transcript, setTranscript]     = useState('');
  const [interimText, setInterimText]   = useState(''); // ← Bug 2 fix : résultats intermédiaires
  const [error, setError]               = useState<string | null>(null);

  // Ref stable : n'est jamais recréé entre les renders
  const recognitionRef  = useRef<any>(null);
  const isListeningRef  = useRef(false); // ← Bug 3 fix : ref pour éviter la closure stale dans onend

  // ── Initialisation unique (pas de dépendance à isListening) ──────────────
  // Bug 1 fix : on crée l'instance UNE SEULE FOIS, pas à chaque changement de isListening
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech-to-Text non supporté par ce navigateur (utilisez Chrome)');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang            = 'fr-FR';
    recognition.continuous      = true;
    recognition.interimResults  = true; // déjà true, mais on l'exploite maintenant

    recognition.onresult = (event: any) => {
      let finalPart   = '';
      let interimPart = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalPart += text;
        } else {
          // Bug 2 fix : on affiche les mots en cours de reconnaissance
          interimPart += text;
        }
      }

      if (finalPart) {
        setTranscript((prev) => (prev + ' ' + finalPart).trimStart());
        setInterimText(''); // vider l'intérimaire une fois finalisé
      }
      if (interimPart) {
        setInterimText(interimPart); // mise à jour en temps réel
      }
    };

    recognition.onerror = (event: any) => {
      // 'no-speech' est bénin (silence trop long), on ne l'affiche pas comme erreur
      if (event.error !== 'no-speech') {
        setError(`Erreur microphone : ${event.error}`);
      }
      setIsListening(false);
      isListeningRef.current = false;
      setInterimText('');
    };

    // Bug 3 fix : on lit isListeningRef (toujours à jour) au lieu de isListening (closure stale)
    recognition.onend = () => {
      if (isListeningRef.current) {
        // relancer automatiquement si l'utilisateur n'a pas cliqué "Arrêter"
        try { recognition.start(); } catch { /* déjà en cours */ }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      try { recognition.stop(); } catch { /* silencieux */ }
    };
  }, []); // ← tableau vide : création unique

  // ── Démarrer ─────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Reconnaissance vocale non disponible');
      return;
    }
    setError(null);
    setTranscript('');
    setInterimText('');
    isListeningRef.current = true;
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch {
      // déjà démarré (ne peut pas arriver deux fois normalement)
    }
  }, []);

  // ── Arrêter ───────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setInterimText('');
    try {
      recognitionRef.current?.stop();
    } catch { /* silencieux */ }
  }, []);

  // ── Réinitialiser le texte ────────────────────────────────────────────────
  const clear = useCallback(() => {
    setTranscript('');
    setInterimText('');
  }, []);

  // Ce que le composant affiche dans le rectangle :
  // - interimText = mots en cours (grisés, temps réel)
  // - transcript  = mots finalisés (confirmés)
  // Le composant peut combiner les deux pour l'affichage
  const displayText = (transcript + (interimText ? ' ' + interimText : '')).trim();

  return { isListening, transcript, interimText, displayText, error, start, stop, clear };
}
