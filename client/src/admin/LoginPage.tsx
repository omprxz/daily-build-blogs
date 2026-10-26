import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.js';
import { Alert, AlertDescription } from '@/components/ui/alert.js';
import { Badge } from '@/components/ui/badge.js';
import { StatusDot } from '@/components/ui/status-dot.js';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login({ email, password });
      if (res?.token) {
        localStorage.setItem('dailybuild_token', res.token);
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl border-slate-200/80 dark:border-white/[0.08] dark:bg-[#0c1220]">
        <CardHeader className="text-center flex flex-col items-center pb-2">
          <div className="flex items-center justify-center mb-3">
            <img
              src="/logo-light.png"
              alt="Daily Build"
              className="h-8 w-auto max-w-[220px] object-contain dark:hidden"
            />
            <img
              src="/logo-dark.png"
              alt="Daily Build"
              className="h-8 w-auto max-w-[220px] object-contain hidden dark:block"
            />
          </div>
          <Badge variant="default" size="sm" dot dotPulse className="mb-2">
            EDITORIAL ADMINISTRATION
          </Badge>
          <CardTitle className="text-lg">Sign In to Command Center</CardTitle>
          <CardDescription>
            Manage publication dispatches, autonomous workflows &amp; multi-model AI routing.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Admin Email
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dailybuild.tech"
                icon={<Mail className="w-4 h-4" />}
                clearable
                onClear={() => setEmail('')}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                icon={<Lock className="w-4 h-4" />}
              />
            </div>

            <Button
              type="submit"
              variant="default"
              size="default"
              loading={loading}
              loadingText="Authenticating..."
              className="w-full mt-2"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="end"
            >
              Sign In to Dashboard
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <StatusDot size="sm" tone="success" />
            <span>Encrypted Session • First-Party Cookies</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
