import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { getApiError } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { AuthShell, Field } from './LoginPage';

export default function RegisterPage() {
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  async function onSubmit(values) {
    setError('');
    try {
      await createAccount(values);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError));
    }
  }

  return (
    <AuthShell>
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft size={16} /> Back to home</Link>
      <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-forest text-lime"><Store size={22} /></div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest">Make it yours</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Create your shop account</h1>
      <p className="mt-2 text-sm leading-6 text-muted">Set up a private workspace for your products and sales.</p>
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Field label="Your name" error={errors.name?.message}>
          <input className="form-input" autoComplete="name" placeholder="Asha Verma" {...register('name', { required: 'Enter your name', minLength: { value: 2, message: 'Use at least 2 characters' }, maxLength: { value: 80, message: 'Use no more than 80 characters' } })} />
        </Field>
        <Field label="Shop name" error={errors.shopName?.message}>
          <input className="form-input" autoComplete="organization" placeholder="Asha Mart" {...register('shopName', { required: 'Enter your shop name', minLength: { value: 2, message: 'Use at least 2 characters' }, maxLength: { value: 100, message: 'Use no more than 100 characters' } })} />
        </Field>
        <Field label="Email address" error={errors.email?.message}>
          <input className="form-input" type="email" autoComplete="email" placeholder="you@yourshop.com" {...register('email', { required: 'Enter your email address', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
        </Field>
        <Field label="Shop address (optional)" error={errors.shopAddress?.message}>
          <input className="form-input" autoComplete="street-address" placeholder="Street, town, city" {...register('shopAddress', { maxLength: { value: 200, message: 'Use no more than 200 characters' } })} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input className="form-input" type="password" autoComplete="new-password" placeholder="At least 8 characters" {...register('password', { required: 'Create a password', minLength: { value: 8, message: 'Use at least 8 characters' }, maxLength: { value: 72, message: 'Use no more than 72 characters' } })} />
        </Field>
        <button className="primary-button w-full !mt-6" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">Already registered? <Link to="/login" className="font-bold text-forest hover:underline">Sign in</Link></p>
    </AuthShell>
  );
}
