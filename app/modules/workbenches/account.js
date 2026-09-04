'use client';

import { useState } from 'react';
import {
  useAccountActions,
  useAccountClient,
  useAccountProfile,
  useAccountState,
  useResolvedAccountUser,
} from '@/modules/account';
import { useAuthState } from '@/modules/auth';
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

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
];

export default function WorkbenchAccount() {
  const authState = useAuthState();
  const accountState = useAccountState();
  const accountActions = useAccountActions();
  const accountClient = useAccountClient();

  const currentAccount = accountState.currentAccount;
  const hasAccount = Boolean(currentAccount);
  const isAuth = authState.isAuthenticated;
  const authUser = authState.user;

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

  // Profile studio state
  const [displayName, setDisplayName] = useState(
    currentAccount?.displayName || authUser?.displayName || 'Ahmet Yılmaz',
  );
  const [bio, setBio] = useState(
    currentAccount?.bio || currentAccount?.profile?.bio || 'Sinema tutkunu, bağımsız film eleştirmeni ve Tvizzie küratörü.',
  );
  const [avatarUrl, setAvatarUrl] = useState(PRESET_AVATARS[0]);
  const [email, setEmail] = useState(currentAccount?.email || authUser?.email || 'ahmet@tvizzie.local');

  // Username resolution directory test
  const [queryUsername, setQueryUsername] = useState('omerdlw');
  const resolvedQueryUser = useResolvedAccountUser({ username: queryUsername });

  // Profile subscription test
  const [profileSubId, setProfileSubId] = useState(currentAccount?.id || authUser?.id || 'user_mock_01');
  const subscribedProfile = useAccountProfile({ resolvedUserId: profileSubId });

  // Update profile handler
  const handleSaveProfile = async () => {
    try {
      addLog('updateAccount', `Profil kaydediliyor: "${displayName}"...`);
      const result = await accountActions.updateCurrentAccount({
        displayName,
        bio,
        avatarUrl,
      });
      addLog('updateAccount:success', result || 'Hesap profili başarıyla güncellendi', 'success');
    } catch (err) {
      addLog('updateAccount:error', err.message, 'error');
    }
  };

  // Sync email handler
  const handleSyncEmail = async () => {
    try {
      addLog('syncEmail', `E-posta senkronize ediliyor: ${email}`);
      const result = await accountActions.syncCurrentAccountEmail(email);
      addLog('syncEmail:success', result || 'Hesap e-postası başarıyla eşitlendi', 'success');
    } catch (err) {
      addLog('syncEmail:error', err.message, 'error');
    }
  };

  // Client method executions
  const handleClientGetMe = async () => {
    try {
      addLog('client.getMe', 'accountClient.getMe() çağrılıyor...');
      const me =
        typeof accountClient?.getMe === 'function'
          ? await accountClient.getMe()
          : currentAccount?.id
            ? await accountClient.getAccount(currentAccount.id)
            : null;
      addLog('client.getMe:result', me || 'Aktif hesap nesnesi döndürüldü', 'info');
    } catch (err) {
      addLog('client.getMe:error', err.message, 'error');
    }
  };

  const handleClientGetAccount = async () => {
    try {
      const targetId = currentAccount?.id || authUser?.id || 'user_mock_01';
      addLog('client.getAccount', `accountClient.getAccount("${targetId}") çağrılıyor...`);
      const acc = await accountClient.getAccount(targetId);
      addLog('client.getAccount:result', acc || 'Hesap kaydı sorgulandı', 'success');
    } catch (err) {
      addLog('client.getAccount:error', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <MetricPill
            label="Hesap Durumu"
            value={hasAccount ? 'Hesap Bağlı' : isAuth ? 'Auth Bekleniyor' : 'Misafir'}
            variant={hasAccount ? 'emerald' : isAuth ? 'amber' : 'neutral'}
          />
          <MetricPill
            label="Kullanıcı Adı"
            value={displayName}
            variant="cyan"
          />
          <MetricPill
            label="E-Posta"
            value={email}
            variant="indigo"
          />
        </div>
        <div className="flex items-center gap-2">
          <ActionBtn
            size="xs"
            variant="neutral"
            icon="solar:refresh-bold"
            onClick={async () => {
              try {
                await accountActions.refreshCurrentAccount();
                addLog('refresh', 'Hesap verisi sunucudan tazelendi', 'info');
              } catch (err) {
                addLog('refresh:error', err.message, 'error');
              }
            }}
          >
            Yenile
          </ActionBtn>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <SegmentedTabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'demos', label: '1. Profil Stüdyosu & Avatar', icon: 'solar:user-id-bold' },
          { id: 'edge_cases', label: '2. Dizin & Client API Yöntemleri', icon: 'solar:magnifer-bold' },
          { id: 'code', label: '3. API & Kod Sözleşmesi', icon: 'solar:code-bold' },
        ]}
      />

      {/* TAB 1: DEMOS */}
      {activeTab === 'demos' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="info"
            title="Hesap & Profil Katmanı Mimarisi"
            description="Account modülü, kimlik doğrulama (Auth) oturumunun üstüne inşa edilen kullanıcı profil bilgilerini (isim, biyografi, avatar, tercihler) yönetir. Eşzamanlı profil aboneliği ve iyimser güncelleme (optimistic update) desenlerini destekler."
          />

          {/* Profile Studio Card */}
          <Section title="Profil Stüdyosu (Profile Studio)">
            <div className="space-y-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex flex-wrap items-center gap-5 border-b border-white/10 pb-5">
                <div className="relative size-20 overflow-hidden rounded-2xl border-2 border-white/20 bg-black/60 shadow-xl">
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                </div>
                <div className="space-y-1">
                  <div className="text-base font-bold text-white">{displayName || 'İsimsiz Kullanıcı'}</div>
                  <div className="text-xs text-white/50">{email}</div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                      Doğrulanmış Hesap
                    </span>
                    <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/70">
                      ID: {currentAccount?.id || authUser?.id || 'mock_id_99'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <div className="mb-2 text-xs font-semibold text-white/70">Hazır Avatarlar</div>
                <div className="flex flex-wrap gap-3">
                  {PRESET_AVATARS.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setAvatarUrl(src);
                        addLog('avatar:select', `Hazır avatar #${i + 1} seçildi`);
                      }}
                      className={`cursor-pointer overflow-hidden rounded-xl border-2 transition-transform hover:scale-105 ${
                        avatarUrl === src ? 'border-cyan-400 shadow-lg shadow-cyan-500/20' : 'border-white/10 opacity-60'
                      }`}
                    >
                      <img src={src} alt="preset" className="size-12 object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextInput label="Görünen İsim" value={displayName} onChange={setDisplayName} />
                <TextInput label="E-Posta Adresi" value={email} onChange={setEmail} />
              </div>
              <TextInput label="Hakkımda / Biyografi" value={bio} onChange={setBio} />

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <ActionBtn
                  variant="primary"
                  icon="solar:check-circle-bold"
                  onClick={handleSaveProfile}
                >
                  Değişiklikleri Kaydet
                </ActionBtn>
                <ActionBtn
                  variant="neutral"
                  icon="solar:letter-bold"
                  onClick={handleSyncEmail}
                >
                  E-Postayı Eşitle
                </ActionBtn>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* TAB 2: EDGE CASES & DIRECTORY */}
      {activeTab === 'edge_cases' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="warning"
            title="Dizin Arama & İstemci API Yöntemleri"
            description="useResolvedAccountUser kullanıcı adına göre kamuya açık profil ararken, accountClient doğrudan arka plan sorgularını çalıştırır."
          />

          <Section title="Kullanıcı Adı Çözümleme Arenası (Directory Lookup)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DemoCard
                title="Kullanıcı Adı Sorgusu"
                badge="useResolvedAccountUser"
                description="Girilen kullanıcı adını arka plandaki hesap veritabanında sorgulayarak çözer."
              >
                <div className="space-y-3">
                  <TextInput
                    label="Kullanıcı Adı (Handle)"
                    value={queryUsername}
                    onChange={setQueryUsername}
                    placeholder="omerdlw"
                  />
                  <JsonViewer
                    data={resolvedQueryUser || { durum: 'Aranan kullanıcı bulunamadı' }}
                    title={`useResolvedAccountUser("${queryUsername}")`}
                  />
                </div>
              </DemoCard>

              <DemoCard
                title="Canlı Profil Aboneliği"
                badge="useAccountProfile"
                description="Belirli bir kullanıcı ID'sine abone olarak verideki değişiklikleri canlı dinler."
              >
                <div className="space-y-3">
                  <TextInput
                    label="Profil ID"
                    value={profileSubId}
                    onChange={setProfileSubId}
                  />
                  <JsonViewer
                    data={subscribedProfile || { durum: 'Profil aboneliği boş' }}
                    title={`useAccountProfile("${profileSubId}")`}
                  />
                </div>
              </DemoCard>
            </div>
          </Section>

          {/* Client SDK Method Sandbox */}
          <Section title="İstemci SDK Yöntemleri (accountClient)">
            <div className="flex flex-wrap items-center gap-3">
              <ActionBtn
                icon="solar:user-id-bold"
                onClick={handleClientGetMe}
              >
                accountClient.getMe() Çağır
              </ActionBtn>
              <ActionBtn
                icon="solar:user-bold"
                onClick={handleClientGetAccount}
              >
                accountClient.getAccount() Çağır
              </ActionBtn>
            </div>
          </Section>

          <Section title="Account Modülü Doğrulama Matrisi">
            <FeatureChecklist
              items={[
                { label: 'useAccountState ile geçerli hesap oturumunun izlenmesi', checked: true },
                { label: 'updateCurrentAccount ile profil güncellemesi', checked: true },
                { label: 'syncCurrentAccountEmail ile e-posta senkronizasyonu', checked: true },
                { label: 'useResolvedAccountUser ile dizin üzerinden kullanıcı arama', checked: true },
                { label: 'useAccountProfile ile canlı profil aboneliği dinleme', checked: true },
                { label: 'createAccountClient SDK fonksiyonlarının sorunsuz yürütülmesi', checked: true },
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
            description="Kullanıcı profil verilerini çekerken useCurrentAccount veya useAccountProfile hook'larını tercih edin."
          />

          <CodeSnippet
            title="1. Profil Güncelleme ve Senkronizasyon"
            code={`import { useAccountActions, useCurrentAccount } from '@/modules/account';

export function EditProfileCard() {
  const account = useCurrentAccount();
  const { updateCurrentAccount } = useAccountActions();

  const handleUpdate = async (newName, newBio) => {
    await updateCurrentAccount({
      displayName: newName,
      bio: newBio,
    });
  };

  return <div>{account?.displayName}</div>;
}`}
          />

          <CodeSnippet
            title="2. Dizin Üzerinden Kullanıcı Profili Arama"
            code={`import { useResolvedAccountUser } from '@/modules/account';

export function UserProfileHeader({ username }) {
  const resolved = useResolvedAccountUser({ username });

  if (resolved.isLoading) return <p>Yükleniyor...</p>;
  if (!resolved.data) return <p>Kullanıcı bulunamadı.</p>;

  return (
    <div>
      <h2>{resolved.data.displayName}</h2>
      <p>{resolved.data.bio}</p>
    </div>
  );
}`}
          />
        </div>
      )}

      {/* Telemetry & State Viewer */}
      <Section title="Canlı Hesap Durumu (Telemetry)">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <JsonViewer data={accountState} title="useAccountState()" />
          <JsonViewer
            data={{
              isAuthenticated: authState.isAuthenticated,
              user: authState.user,
              capabilities: authState.capabilities,
            }}
            title="useAuthState()"
          />
        </div>
      </Section>

      {/* Log Console */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Hesap Olay Günlüğü" />
    </div>
  );
}

