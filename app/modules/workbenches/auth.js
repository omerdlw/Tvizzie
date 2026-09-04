'use client';

import { useEffect, useState } from 'react';
import {
  AnonymousGate,
  AuthGate,
  buildOAuthCallbackUrl,
  isPasskeyBrowserSupported,
  sanitizeAuthNextPath,
  useAuthActions,
  useAuthorization,
  useAuthState,
} from '@/modules/auth';
import { ActionBtn, JsonViewer, LogConsole, Section, StateBadge, TextInput } from './shared';

export default function WorkbenchAuth() {
  const authState = useAuthState();
  const authActions = useAuthActions();

  const [logs, setLogs] = useState([]);
  const addLog = (action, message, type = 'info') => {
    setLogs((prev) => [
      {
        action,
        message: typeof message === 'object' ? JSON.stringify(message) : String(message),
        time: new Date().toLocaleTimeString(),
        type,
      },
      ...prev.slice(0, 49),
    ]);
  };

  // Cihaz Passkey desteği
  const [passkeySupport, setPasskeySupport] = useState(false);
  useEffect(() => {
    setPasskeySupport(isPasskeyBrowserSupported());
  }, []);

  // Form girdileri
  const [email, setEmail] = useState('test@tvizzie.local');
  const [password, setPassword] = useState('SuperSecret123!');
  const [displayName, setDisplayName] = useState('Test Kullanıcısı');

  // Yetkilendirme (Authorization / RBAC) kural denetimi
  const userCheck = useAuthorization('user');
  const adminCheck = useAuthorization('admin');
  const updateContentCheck = useAuthorization({ capability: 'content.update' });

  // 1. Hızlı Simülasyon: Normal Kullanıcı
  const handleSimulateUser = async () => {
    try {
      addLog(
        'simulasyon:kullanici',
        'Normal kullanıcı ("ahmet@tvizzie.local") oturumu simüle ediliyor...',
        'info',
      );
      await authActions.signIn({
        provider: 'mock',
        mockUser: {
          id: 'user_mock_01',
          email: 'ahmet@tvizzie.local',
          displayName: 'Ahmet Yılmaz',
          role: 'user',
          capabilities: ['content.read', 'lists.manage'],
        },
      });
      addLog('simulasyon:basarili', 'Normal kullanıcı girişi yapıldı', 'success');
    } catch (err) {
      addLog('simulasyon:hata', err.message, 'error');
    }
  };

  // 2. Hızlı Simülasyon: Yönetici (Admin)
  const handleSimulateAdmin = async () => {
    try {
      addLog(
        'simulasyon:admin',
        'Yönetici (Admin) ("admin@tvizzie.local") oturumu simüle ediliyor...',
        'info',
      );
      await authActions.signIn({
        provider: 'mock',
        mockUser: {
          id: 'admin_mock_99',
          email: 'admin@tvizzie.local',
          displayName: 'Sistem Yöneticisi',
          role: 'admin',
          capabilities: ['content.read', 'content.update', 'content.delete', 'system.admin'],
        },
      });
      addLog('simulasyon:basarili', 'Yönetici girişi yapıldı (Admin yetkileri aktif)', 'success');
    } catch (err) {
      addLog('simulasyon:hata', err.message, 'error');
    }
  };

  // 3. Oturumu Kapat (Misafir Ol)
  const handleSignOut = () => {
    try {
      addLog('signOut', 'Oturum kapatılıyor...');
      authActions.signOut({ scope: 'local' });
      addLog('signOut:basarili', 'Oturum kapatıldı, misafir durumuna geçildi', 'info');
    } catch (err) {
      addLog('signOut:hata', err.message, 'error');
    }
  };

  // Gerçek giriş formu
  const handleManualSignIn = async () => {
    try {
      addLog('signIn', `${email} ile giriş yapılıyor...`);
      await authActions.signIn({
        provider: 'credentials',
        credentials: { email, password },
      });
      addLog('signIn:sonuc', 'Giriş komutu başarıyla iletildi', 'success');
    } catch (err) {
      addLog('signIn:hata', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Aktif Oturum */}
      <Section
        title="Oturum Durumu"
        badge={authState.isAuthenticated ? 'Aktif' : 'Misafir'}
        actions={
          authState.isAuthenticated ? (
            <ActionBtn size="xs" onClick={handleSignOut} variant="danger">
              Çıkış
            </ActionBtn>
          ) : null
        }
      >
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-base font-bold text-white shadow-md">
              {authState.user?.displayName?.[0] || authState.user?.email?.[0] || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">
                  {authState.user?.displayName ||
                    (authState.isAuthenticated ? 'Kullanıcı' : 'Misafir')}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold uppercase ${
                    authState.user?.role === 'admin'
                      ? 'border border-amber-500/30 bg-amber-500/20 text-amber-300'
                      : authState.isAuthenticated
                        ? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                        : 'bg-white/10 text-white/70'
                  }`}
                >
                  {authState.user?.role || 'Misafir'}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-xs text-white/50">
                {authState.user?.email || 'Anonim oturum'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionBtn
              onClick={handleSimulateUser}
              variant="default"
              size="xs"
              icon="solar:user-bold"
            >
              Kullanıcı Ol
            </ActionBtn>
            <ActionBtn
              onClick={handleSimulateAdmin}
              variant="primary"
              size="xs"
              icon="solar:crown-bold"
            >
              Admin Ol
            </ActionBtn>
            {authState.isAuthenticated && (
              <ActionBtn
                onClick={handleSignOut}
                variant="danger"
                size="xs"
                icon="solar:logout-2-bold"
              >
                Çıkış
              </ActionBtn>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <StateBadge
            label="Oturum"
            value={authState.isAuthenticated ? 'Açık' : 'Kapalı'}
            variant={authState.isAuthenticated ? 'success' : 'neutral'}
          />
          <StateBadge label="Rol" value={authState.user?.role || 'Anonim'} variant="info" />
          <StateBadge
            label="Passkey"
            value={passkeySupport ? 'Destekleniyor' : 'Yok'}
            variant={passkeySupport ? 'success' : 'warning'}
          />
        </div>

        <JsonViewer
          data={{
            oturumAcikMi: authState.isAuthenticated,
            yukleniyor: authState.isLoading,
            kullanici: authState.user,
            hata: authState.error,
          }}
          title="useAuthState() JSON"
        />
      </Section>

      {/* Kapı Bileşenleri */}
      <Section title="Kapı Bileşenleri (Gates)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-medium text-emerald-400">&lt;AuthGate&gt;</span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-xs text-emerald-300">
                Giriş Şart
              </span>
            </div>
            <AuthGate
              fallback={
                <div className="rounded-lg border border-dashed border-white/10 bg-black/60 p-3 text-xs text-white/50">
                  Giriş yapıldığında görünür
                </div>
              }
            >
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 font-mono text-xs text-emerald-300">
                Oturum açık. Aktif kullanıcı: {authState.user?.email}
              </div>
            </AuthGate>
          </div>

          <div className="space-y-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-medium text-sky-400">&lt;AnonymousGate&gt;</span>
              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 font-mono text-xs text-sky-300">
                Misafir Şart
              </span>
            </div>
            <AnonymousGate
              fallback={
                <div className="rounded-lg border border-dashed border-white/10 bg-black/60 p-3 text-xs text-white/50">
                  Oturum açık olduğu için gizlendi
                </div>
              }
            >
              <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 font-mono text-xs text-sky-300">
                Misafir modundasınız
              </div>
            </AnonymousGate>
          </div>
        </div>
      </Section>

      {/* Yetki Denetimi */}
      <Section title="Yetki Denetimi (RBAC)">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/50">&apos;user&apos; Rolü:</div>
            <div
              className={`text-sm font-semibold ${userCheck ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {userCheck ? 'Yetkili' : 'Yetkisiz'}
            </div>
          </div>

          <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/50">&apos;admin&apos; Rolü:</div>
            <div
              className={`text-sm font-semibold ${adminCheck ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {adminCheck ? 'Yetkili (Admin)' : 'Yetkisiz'}
            </div>
          </div>

          <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/50">&apos;content.update&apos;:</div>
            <div
              className={`text-sm font-semibold ${updateContentCheck ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {updateContentCheck ? 'Açık' : 'Kilitli'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
          <span className="text-xs text-white/50">Yönetici Eylemi:</span>
          <ActionBtn
            onClick={() =>
              addLog('yoneticiEylemi', 'Özel sistem temizliği çalıştırıldı', 'success')
            }
            disabled={!adminCheck}
            variant={adminCheck ? 'primary' : 'default'}
            size="xs"
          >
            {adminCheck ? 'Sistem Temizliği' : 'Admin Gerekir'}
          </ActionBtn>
        </div>
      </Section>

      {/* Form Girişi */}
      <Section title="Form Girişi">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextInput label="E-posta" value={email} onChange={setEmail} />
          <TextInput label="Şifre" type="password" value={password} onChange={setPassword} />
          <TextInput label="Görünen İsim" value={displayName} onChange={setDisplayName} />
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionBtn onClick={handleManualSignIn} variant="primary" icon="solar:login-2-bold">
            Giriş Yap
          </ActionBtn>
          <ActionBtn
            onClick={() => {
              addLog('signUp', `${email} için kayıt isteği gönderildi`);
              authActions.signUp({ email, password, displayName });
            }}
            icon="solar:user-plus-bold"
          >
            Kayıt Ol
          </ActionBtn>
          <ActionBtn
            onClick={() => {
              const url = buildOAuthCallbackUrl('google', { redirectTo: '/account' });
              addLog('OAuthUrl', `Oluşturulan callback: ${url}`, 'info');
            }}
            icon="solar:link-bold"
          >
            OAuth Test
          </ActionBtn>
        </div>
      </Section>

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Logs" />
    </div>
  );
}
