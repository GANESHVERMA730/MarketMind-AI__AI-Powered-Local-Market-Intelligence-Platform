import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Store } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { getApiError } from '../api/http';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  async function onSubmit(values) {
    setError('');
    try {
      await login(values);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError));
    }
  }

  return (
    <AuthShell>
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft size={16} /> Back to home</Link>
      <div className="mb-7 grid h-12 w-12 place-items-center rounded-2xl bg-forest text-lime"><Store size={22} /></div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest">Welcome back</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Sign in to your shop</h1>
      <p className="mt-2 text-sm leading-6 text-muted">Your stock, sales, and shop snapshot are waiting.</p>
      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5" noValidate>
        <Field label="Email address" error={errors.email?.message}>
          <input className="form-input" type="email" autoComplete="email" placeholder="you@yourshop.com" {...register('email', { required: 'Enter your email address', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <div className="relative">
            <input className="form-input pr-12" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" {...register('password', { required: 'Enter your password' })} />
            <button type="button" className="absolute inset-y-0 right-3 text-muted" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
        </Field>
        <button className="primary-button w-full" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">New to MarketMind? <Link to="/register" className="font-bold text-forest hover:underline">Create an account</Link></p>
    </AuthShell>
  );
}

export function AuthShell({ children }) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-20 -top-24 h-96 w-96 rounded-full bg-forest/70 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-3 font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink"><Store size={20} /></span>MarketMind AI</Link>
        <div className="relative max-w-xl pb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">For the work behind every counter</p>
          <h2 className="mt-5 text-5xl font-bold leading-tight tracking-tight">Spend less time guessing. Know your shop.</h2>
          <p className="mt-5 max-w-lg leading-7 text-white/65">A practical place to record the everyday and understand what your own numbers are telling you.</p>
        </div>
        <p className="relative text-xs text-white/45">Your account is private. Your records belong to your shop.</p>
      </aside>
    </main>
  );
}

export function Field({ label, error, children }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      <span>{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  );
}
