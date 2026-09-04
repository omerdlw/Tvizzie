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
import {
  ActionBtn,
  CodeSnippet,
  DemoCard,
  FeatureChecklist,
  JsonViewer,
  LogConsole,
  MetricPill,
  NoticeBanner,
  Section,
  SegmentedTabs,
  StateBadge,
  TextInput,
} from './shared';

const PERSONAS = [
  {
    id: 'guest',
    title: '1. Misafir (Guest)',
    role: null,
    email: null,
    displayName: 'Misafir Ziyaretçi',
    capabilities: [],
    badge: 'Anonim',
    badgeVariant: 'neutral',
  },
  {
    id: 'viewer',
    title: '2. Standart İzleyici (Viewer)',
    role: 'user',
    email: 'izleyici@tvizzie.local',
    displayName: 'Caner İzleyici',
    capabilities: ['content.read', 'lists.manage'],
    badge: 'User Rolü',
    badgeVariant: 'info',
  },
  {
    id: 'editor',
    title: '3. İçerik Editörü (Editor)',
    role: 'editor',
    email: 'editor@tvizzie.local',
    displayName: 'Selin Editör',
    capabilities: ['content.read', 'content.update', 'lists.manage'],
    badge: 'Editor Rolü',
    badgeVariant: 'warning',
  },
  {
    id: 'admin',
    title: '4. Süper Yönetici (Admin)',
    role: 'admin',
    email: 'admin@tvizzie.local',
    displayName: 'Kemal Yönetici',
    capabilities: ['content.read', 'content.update', 'content.delete', 'system.admin'],
    badge: 'Admin Rolü',
    badgeVariant: 'emerald',
  },
];

export default function WorkbenchAuth() {
  const authState = useAuthState();
  const authActions = useAuthActions();

  const [activeTab, setActiveTab] = useState('demos');
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

  // Browser Passkey capability
  const [passkeySupport, setPasskeySupport] = useState(false);
  useEffect(() => {
    setPasskeySupport(isPasskeyBrowserSupported());
  }, []);

  // Form credentials
  const [email, setEmail] = useState('test@tvizzie.local');
  const [password, setPassword] = useState('SuperSecret123!');
  const [displayName, setDisplayName] = useState('Test Kullanıcısı');

  // Open-redirect attack sanitizer test
  const [unsafePathInput, setUnsafePathInput] = useState('//evil-attacker.com/steal-token');
  const [sanitizedPathResult, setSanitizedPathResult] = useState('');

  useEffect(() => {
    setSanitizedPathResult(sanitizeAuthNextPath(unsafePathInput));
  }, [unsafePathInput]);

  // RBAC hook evaluations
  const isUser = useAuthorization('user');
  const isAdmin = useAuthorization('admin');
  const canReadContent = useAuthorization({ capability: 'content.read' });
  const canUpdateContent = useAuthorization({ capability: 'content.update' });
  const canDeleteContent = useAuthorization({ capability: 'content.delete' });
  const canSystemAdmin = useAuthorization({ capability: 'system.admin' });

  // Persona switch handler
  const handleSwitchPersona = async (persona) => {
    try {
      if (!persona.role) {
        authActions.signOut({ scope: 'local' });
        addLog('persona:guest', 'Misafir durumuna geçildi, oturum kapatıldı', 'info');
        return;
      }

      await authActions.signIn({
        provider: 'mock',
        mockUser: {
          id: `mock_${persona.id}`,
          email: persona.email,
          displayName: persona.displayName,
          role: persona.role,
          capabilities: persona.capabilities,
        },
      });
      addLog('persona:switched', `Persona aktif edildi: "${persona.displayName}" (${persona.role})`, 'success');
    } catch (err) {
      addLog('persona:error', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <MetricPill
            label="Oturum Durumu"
            value={authState.isAuthenticated ? 'Oturum Açık' : 'Misafir (Anonim)'}
            variant={authState.isAuthenticated ? 'emerald' : 'neutral'}
          />
          <MetricPill
            label="Rol (RBAC)"
            value={authState.user?.role || 'Yok (Misafir)'}
            variant={authState.user?.role === 'admin' ? 'amber' : 'indigo'}
          />
          <MetricPill
            label="Kullanıcı E-Posta"
            value={authState.user?.email || 'Anonim'}
            variant="cyan"
          />
          <MetricPill
            label="Cihaz Passkey"
            value={passkeySupport ? 'Destekleniyor' : 'Yok'}
            variant={passkeySupport ? 'emerald' : 'warning'}
          />
        </div>
        <div className="flex items-center gap-2">
          {authState.isAuthenticated && (
            <ActionBtn
              size="xs"
              variant="danger"
              icon="solar:logout-2-bold"
              onClick={() => handleSwitchPersona(PERSONAS[0])}
            >
              Çıkış Yap
            </ActionBtn>
          )}
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <SegmentedTabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'demos', label: '1. Persona & Yetki Matrisi', icon: 'solar:users-group-rounded-bold' },
          { id: 'edge_cases', label: '2. Güvenlik & Sanitization Sandbox', icon: 'solar:shield-check-bold' },
          { id: 'code', label: '3. API & Kod Sözleşmesi', icon: 'solar:code-bold' },
        ]}
      />

      {/* TAB 1: DEMOS */}
      {activeTab === 'demos' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="info"
            title="Kullanıcı Persona ve RBAC Mimarisi"
            description="Tvizzie Auth katmanı; rol (role) ve detaylı yetenek (capabilities) bazlı erişim denetimi (RBAC) sağlar. Aşağıdaki kartlara tıklayarak tek tıkla oturum rolünü değiştirebilir ve yetki matrisinin anlık tepkisini gözlemleyebilirsiniz."
          />

          {/* 4 Persona Cards Grid */}
          <Section title="Persona Değiştirici (Quick Persona Switcher)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              {PERSONAS.map((p) => {
                const isActive = (!p.role && !authState.isAuthenticated) || (authState.user?.role === p.role);
                return (
                  <DemoCard
                    key={p.id}
                    title={p.title}
                    badge={p.badge}
                    description={p.email ? `${p.email} • ${p.capabilities.length} yetki` : 'Kayıtsız ziyaretçi'}
                  >
                    <div className="space-y-3">
                      <ActionBtn
                        fullWidth
                        variant={isActive ? 'success' : 'primary'}
                        icon={isActive ? 'solar:check-circle-bold' : 'solar:user-bold'}
                        onClick={() => handleSwitchPersona(p)}
                      >
                        {isActive ? 'Aktif Persona' : 'Bu Persona Ol'}
                      </ActionBtn>
                    </div>
                  </DemoCard>
                );
              })}
            </div>
          </Section>

          {/* Live RBAC Capability Matrix */}
          <Section title="Canlı Yetki & İzin Matrisi (useAuthorization)">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <div className="text-[11px] text-white/50">&apos;user&apos; Rolü</div>
                <div className={`text-xs font-bold ${isUser ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isUser ? '✓ Yetkili' : '✕ Yetkisiz'}
                </div>
              </div>

              <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <div className="text-[11px] text-white/50">&apos;admin&apos; Rolü</div>
                <div className={`text-xs font-bold ${isAdmin ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isAdmin ? '✓ Yetkili' : '✕ Yetkisiz'}
                </div>
              </div>

              <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <div className="text-[11px] text-white/50">content.read</div>
                <div className={`text-xs font-bold ${canReadContent ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {canReadContent ? '✓ Açık' : '✕ Kilitli'}
                </div>
              </div>

              <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <div className="text-[11px] text-white/50">content.update</div>
                <div className={`text-xs font-bold ${canUpdateContent ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {canUpdateContent ? '✓ Açık' : '✕ Kilitli'}
                </div>
              </div>

              <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <div className="text-[11px] text-white/50">content.delete</div>
                <div className={`text-xs font-bold ${canDeleteContent ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {canDeleteContent ? '✓ Açık' : '✕ Kilitli'}
                </div>
              </div>

              <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <div className="text-[11px] text-white/50">system.admin</div>
                <div className={`text-xs font-bold ${canSystemAdmin ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {canSystemAdmin ? '✓ Açık' : '✕ Kilitli'}
                </div>
              </div>
            </div>
          </Section>

          {/* Gate Components Demo */}
          <Section title="Koşullu Kapı Bileşenleri (<AuthGate> vs <AnonymousGate>)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-emerald-300">&lt;AuthGate&gt;</span>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                    Oturum Zorunlu
                  </span>
                </div>
                <AuthGate
                  fallback={
                    <div className="rounded-lg border border-dashed border-white/10 bg-black/60 p-3 text-xs text-white/50">
                      🔒 Bu içerik kilitli. Görmek için oturum açmalısınız.
                    </div>
                  }
                >
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 font-mono text-xs text-emerald-300">
                    ✓ Oturum açık. Hoş geldiniz, {authState.user?.displayName || authState.user?.email}!
                  </div>
                </AuthGate>
              </div>

              <div className="space-y-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-sky-300">&lt;AnonymousGate&gt;</span>
                  <span className="rounded bg-sky-500/20 px-2 py-0.5 font-mono text-[10px] text-sky-300">
                    Sadece Misafirler
                  </span>
                </div>
                <AnonymousGate
                  fallback={
                    <div className="rounded-lg border border-dashed border-white/10 bg-black/60 p-3 text-xs text-white/50">
                      ℹ Oturum açık olduğu için misafir banner&apos;ı gizlendi.
                    </div>
                  }
                >
                  <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 font-mono text-xs text-sky-300">
                    👋 Ziyaretçi modundasınız. Avantajlardan yararlanmak için hesap oluşturun.
                  </div>
                </AnonymousGate>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* TAB 2: EDGE CASES & SECURITY */}
      {activeTab === 'edge_cases' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="warning"
            title="Güvenlik & Açık Yönlendirme (Open-Redirect) Koruması"
            description="Giriş veya kayıt sonrası kullanıcıyı yönlendirirken dış kaynaklı zararlı URL'ler (örneğin //evil.com veya javascript: URL'leri) sanitizeAuthNextPath fonksiyonuyla güvenli kök dizinine (/) veya güvenli iç yollara temizlenir."
          />

          <Section title="Yönlendirme Sanitizer Laboratuvarı (sanitizeAuthNextPath)">
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <TextInput
                label="Güvensiz / Şüpheli Girdi URL"
                value={unsafePathInput}
                onChange={setUnsafePathInput}
                placeholder="//evil-attacker.com/steal-token"
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ActionBtn
                  size="xs"
                  onClick={() => setUnsafePathInput('//evil-attacker.com/steal-token')}
                >
                  Protokol Göreli Saldırı
                </ActionBtn>
                <ActionBtn
                  size="xs"
                  onClick={() => setUnsafePathInput('javascript:alert(document.cookie)')}
                >
                  XSS Script Yönlendirmesi
                </ActionBtn>
                <ActionBtn
                  size="xs"
                  onClick={() => setUnsafePathInput('/account/security?tab=passkeys')}
                >
                  Güvenli İç Rota
                </ActionBtn>
              </div>

              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5">
                <div className="text-xs text-cyan-200/70">sanitizeAuthNextPath() Çıktısı:</div>
                <div className="font-mono text-sm font-bold text-cyan-300">
                  {sanitizedPathResult || '(Boş ya da kök /)'}
                </div>
              </div>
            </div>
          </Section>

          {/* OAuth Callback Builder Test */}
          <Section title="OAuth Callback URL Üretici (buildOAuthCallbackUrl)">
            <div className="flex flex-wrap items-center gap-3">
              <ActionBtn
                icon="solar:link-bold"
                onClick={() => {
                  const url = buildOAuthCallbackUrl('google', { redirectTo: '/account' });
                  addLog('oauthUrl', `Google callback üretildi: ${url}`, 'info');
                }}
              >
                Google Callback Üret
              </ActionBtn>
              <ActionBtn
                icon="solar:link-bold"
                onClick={() => {
                  const url = buildOAuthCallbackUrl('github', { redirectTo: '/modules' });
                  addLog('oauthUrl', `GitHub callback üretildi: ${url}`, 'info');
                }}
              >
                GitHub Callback Üret
              </ActionBtn>
            </div>
          </Section>

          <Section title="Auth Modülü Doğrulama Matrisi">
            <FeatureChecklist
              items={[
                { label: 'Role & Capability bazlı RBAC denetimi (useAuthorization)', checked: true },
                { label: 'Koşullu render için <AuthGate> ve <AnonymousGate> desteği', checked: true },
                { label: 'Açık yönlendirme (Open-Redirect) koruması (sanitizeAuthNextPath)', checked: true },
                { label: 'OAuth sağlayıcı callback URL yapılandırması (buildOAuthCallbackUrl)', checked: true },
                { label: 'Tarayıcı Passkey / WebAuthn donanım desteği algılama', checked: true },
                { label: 'Oturum kapatıldığında yerel durumun temizlenmesi', checked: true },
              ]}
            />
          </Section>
        </div>
      )}

      {/* TAB 3: CODE SNIPPETS */}
      {activeTab === 'code' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="success"
            title="Kullanım Standartları & Best Practices"
            description="Auth hook'ları SSR ve istemci tarafında tutarlı oturum denetimi sağlar."
          />

          <CodeSnippet
            title="1. useAuthorization ile RBAC Kural Denetimi"
            code={`import { useAuthorization } from '@/modules/auth';

function AdminActionsPanel() {
  const isAdmin = useAuthorization('admin');
  const canDelete = useAuthorization({ capability: 'content.delete' });

  if (!isAdmin) return <p>Yalnızca yöneticiler görebilir.</p>;

  return (
    <div>
      <button disabled={!canDelete}>İçeriği Sil</button>
    </div>
  );
}`}
          />

          <CodeSnippet
            title="2. Güvenli Yönlendirme ve AuthGate Kullanımı"
            code={`import { AuthGate, sanitizeAuthNextPath } from '@/modules/auth';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ProtectedProfile() {
  const searchParams = useSearchParams();
  const nextPath = sanitizeAuthNextPath(searchParams.get('next'));

  return (
    <AuthGate fallback={<p>Lütfen önce oturum açın.</p>}>
      <main>Korumalı Profil İçeriği</main>
    </AuthGate>
  );
}`}
          />
        </div>
      )}

      {/* Telemetry State Viewer */}
      <Section title="Canlı Oturum Durumu (useAuthState)">
        <JsonViewer
          data={{
            oturumAcikMi: authState.isAuthenticated,
            yukleniyor: authState.isLoading,
            kullanici: authState.user,
            hata: authState.error,
          }}
          title="useAuthState()"
        />
      </Section>

      {/* Log Console */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Auth Olay Günlüğü" />
    </div>
  );
}

