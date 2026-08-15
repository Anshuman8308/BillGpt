import { useEffect, useRef } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;

  onListeningChange?: (isListening: boolean) => void;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Ask a followup question",
  onListeningChange,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isSupported, isListening, transcript, error, start, stop } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) onChange(transcript);
  
  }, [transcript]);

  useEffect(() => {
    onListeningChange?.(isListening);
   
  }, [isListening]);

  const prevListening = useRef(isListening);
  useEffect(() => {
    if (prevListening.current && !isListening && transcript.trim()) {
      onSubmit(transcript.trim());
    }
    prevListening.current = isListening;
    
  }, [isListening]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  function handleMicClick() {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 bg-white rounded-full shadow-card px-4 py-3"
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Search query"
          className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink/40 text-[15px] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleMicClick}
          disabled={disabled}
          aria-label={isListening ? "Stop voice input" : "Start voice input"}
          aria-pressed={isListening}
          title={isSupported ? "Search by voice" : "Voice search not supported in this browser"}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition disabled:opacity-40 ${
            isListening ? "bg-accent-red text-white animate-pulse" : "bg-ink/5 text-ink/60 hover:bg-ink/10"
          }`}
        >
          🎤
        </button>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Search"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-ink text-cream disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition"
        >
          →
        </button>
      </form>
      {error && (
        <p role="status" className="text-xs text-white/90 mt-1.5 px-2 drop-shadow">
          {error}
        </p>
      )}
      {isListening && (
        <p role="status" className="text-xs text-white/90 mt-1.5 px-2 drop-shadow">
          Listening… speak your search now.
        </p>
      )}
    </div>
  );
}
