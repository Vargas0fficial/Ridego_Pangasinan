'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ArrowLeft, MessageSquareText } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import type { Role, User } from '@/lib/types';
import { Logo } from './Logo';
import { Field, Spinner } from './ui';

type Challenge = { phone: string; expiresInSeconds: number; resendInSeconds: number };

function Inner({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn, fail, toast } = useApp();
  const [role, setRole] = useState<Role>(params.get('role') === 'rider' ? 'rider' : 'passenger');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');
  const [busy, setBusy] = useState(false);
  const register = mode === 'register';

  // Step 2 of sign-up: enter the code that was texted.
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const finish = (token: string, user: User) => {
    signIn(token, user);
    router.replace(`/${user.role}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (register) {
        const c = await api<Challenge>('/api/auth/register', {
          body: { name, phone, password, role, vehicle: role === 'rider' ? { model, plate, color } : undefined },
        });
        setChallenge(c);
        setCode('');
        setResendIn(c.resendInSeconds);
        setBusy(false);
        return;
      }
      const res = await api<{ token: string; user: User }>('/api/auth/login', { body: { phone, password } });
      finish(res.token, res.user);
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    try {
      const res = await api<{ token: string; user: User }>('/api/auth/register/verify', { body: { phone: challenge.phone, code } });
      finish(res.token, res.user);
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!challenge || resendIn > 0) return;
    try {
      const c = await api<Challenge>('/api/auth/register/resend', { body: { phone: challenge.phone } });
      setChallenge(c);
      setCode('');
      setResendIn(c.resendInSeconds);
      toast('New code sent');
    } catch (err) {
      fail(err);
    }
  };

  const shell = 'h-full overflow-y-auto px-5';
  const shellStyle = { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' };

  if (challenge) {
    return (
      <main className={shell} style={shellStyle}>
        <button
          className="iconbtn"
          aria-label="Back to the sign-up form"
          onClick={() => {
            setChallenge(null);
            setBusy(false);
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary-strong">
          <MessageSquareText size={28} />
        </div>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">Confirm your number</h1>
        <p className="mt-1 text-muted">
          We texted a 6-digit code to <span className="font-bold text-fg">{phone}</span>. It expires in {Math.round(challenge.expiresInSeconds / 60)} minutes.
        </p>

        <form onSubmit={verify} className="mt-6 space-y-4">
          <Field label="Confirmation code">
            <input
              className="input text-center font-display text-3xl font-extrabold tracking-[.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="••••••"
              maxLength={6}
              aria-label="6-digit confirmation code"
            />
          </Field>
          <button className="btn" disabled={busy || code.length !== 6}>
            {busy ? <Spinner /> : 'Verify and create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Didn't get it?{' '}
          <button className="font-bold text-primary-strong disabled:text-muted" onClick={resend} disabled={resendIn > 0}>
            {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
          </button>
        </p>
      </main>
    );
  }

  return (
    <main className={shell} style={shellStyle}>
      <Link href="/" aria-label="RideGo Pangasinan home">
        <Logo />
      </Link>
      <h1 className="mt-8 font-display text-3xl font-extrabold tracking-tight">{register ? 'Create your account' : 'Welcome back'}</h1>
      <p className="mt-1 text-muted">{register ? 'Join RideGo Pangasinan in a minute.' : 'Log in to keep riding across Pangasinan.'}</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {register && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface2 p-1" role="radiogroup" aria-label="I want to">
            {(['passenger', 'rider'] as Role[]).map((r) => (
              <button
                type="button"
                key={r}
                role="radio"
                aria-checked={role === r}
                onClick={() => setRole(r)}
                className={`min-h-[46px] rounded-xl text-sm font-bold ${role === r ? 'bg-surface text-primary-strong shadow' : 'text-muted'}`}
              >
                {r === 'passenger' ? 'I need a ride' : 'I want to drive'}
              </button>
            ))}
          </div>
        )}
        {register && (
          <Field label="Full name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Juan Dela Cruz" required />
          </Field>
        )}
        <Field label="Mobile number" hint={register ? "We'll text you a confirmation code. Example: 09171234567" : 'Philippine number, like 09171234567'}>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="09XX XXX XXXX" required />
        </Field>
        <Field label="Password" hint={register ? 'At least 8 characters' : undefined}>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : 1} required />
        </Field>
        {register && role === 'rider' && (
          <div className="space-y-4 rounded-2xl border border-line p-3.5">
            <div className="sec-title">Your motorcycle</div>
            <Field label="Model">
              <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Honda Click 125" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plate number">
                <input className="input uppercase" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="ABC 1234" required />
              </Field>
              <Field label="Color">
                <input className="input" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Red" required />
              </Field>
            </div>
          </div>
        )}
        <button className="btn" disabled={busy}>
          {busy ? <Spinner /> : register ? 'Send confirmation code' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {register ? 'Already have an account? ' : 'New to RideGo Pangasinan? '}
        <Link className="font-bold text-primary-strong" href={register ? '/login' : '/register'}>
          {register ? 'Log in' : 'Sign up'}
        </Link>
      </p>
    </main>
  );
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  return (
    <Suspense>
      <Inner mode={mode} />
    </Suspense>
  );
}