"use client";

import { InputHTMLAttributes, forwardRef, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = "", ...rest },
  ref
) {
  return (
    <label className="block">
      {label ? (
        <span className="block mb-1.5 text-sm font-medium text-slate-700">{label}</span>
      ) : null}
      <input
        ref={ref}
        className={`w-full h-11 px-4 rounded-lg bg-[#e6f2f6]/60 text-slate-900 placeholder:text-slate-500 border border-transparent focus:border-[#0a7a90] focus:bg-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-80 transition-colors ${className}`}
        {...rest}
      />
      {error ? <span className="block mt-1 text-xs text-red-600">{error}</span> : null}
    </label>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className = "", ...rest },
  ref
) {
  return (
    <label className="block">
      {label ? (
        <span className="block mb-1.5 text-sm font-medium text-slate-700">{label}</span>
      ) : null}
      <textarea
        ref={ref}
        className={`w-full min-h-[100px] px-4 py-3 rounded-lg bg-[#e6f2f6]/60 text-slate-900 placeholder:text-slate-500 border border-transparent focus:border-[#0a7a90] focus:bg-white transition-colors ${className}`}
        {...rest}
      />
      {error ? <span className="block mt-1 text-xs text-red-600">{error}</span> : null}
    </label>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className = "", children, ...rest },
  ref
) {
  return (
    <label className="block">
      {label ? (
        <span className="block mb-1.5 text-sm font-medium text-slate-700">{label}</span>
      ) : null}
      <select
        ref={ref}
        className={`w-full h-11 px-3 rounded-lg bg-[#e6f2f6]/60 text-slate-900 border border-transparent focus:border-[#0a7a90] focus:bg-white transition-colors ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error ? <span className="block mt-1 text-xs text-red-600">{error}</span> : null}
    </label>
  );
});
