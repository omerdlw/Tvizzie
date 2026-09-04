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
import { ActionBtn, JsonViewer, LogConsole, Section, StateBadge, TextInput } from './shared';

export default function WorkbenchAccount() {
  const authState = useAuthState();
  const accountState = useAccountState();
  const accountActions = useAccountActions();
  const accountClient = useAccountClient();

  const currentAccount = accountState.currentAccount;
  const hasAccount = Boolean(currentAccount);
  const hasProfile = Boolean(currentAccount?.profile || currentAccount?.id);
  const isAuth = authState.isAuthenticated;
  const authUser = authState.user;

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

  // Hesap güncelleme form alanları
  const [newDisplayName, setNewDisplayName] = useState(
    currentAccount?.displayName || authUser?.displayName || 'Yeni Kullanıcı Adı',
  );
  const [newBio, setNewBio] = useState(
    currentAccount?.bio || currentAccount?.profile?.bio || 'Tvizzie modül test ortamı biyografisi',
  );
  const [newEmail, setNewEmail] = useState(
    currentAccount?.email || authUser?.email || 'yeniposta@tvizzie.local',
  );

  // Kullanıcı adı çözümleme testi
  const [queryUsername, setQueryUsername] = useState('omerdlw');
  const resolvedQueryUser = useResolvedAccountUser({ username: queryUsername });

  // Canlı profil aboneliği
  const [profileSubscriptionId, setProfileSubscriptionId] = useState(
    currentAccount?.id || authUser?.id || 'user_mock_01',
  );
  const subscribedProfile = useAccountProfile({ resolvedUserId: profileSubscriptionId });

  // Auth oturumundan hesabı eşitleme
  const handleEnsureFromAuth = async () => {
    if (!authUser) {
      addLog(
        'ensureAccount:hata',
        'Oturum açmış bir kullanıcı bulunamadı. Önce Auth sekmesinden giriş yapın.',
        'error',
      );
      return;
    }
    try {
      addLog(
        'ensureAccount',
        `Oturum verisi ile hesap başlatılıyor: ${authUser.email || authUser.id}`,
      );
      const result = await accountActions.ensureCurrentAccount({
        displayName: authUser.displayName,
      });
      addLog(
        'ensureAccount:basarili',
        result || 'Hesap başarıyla oluşturuldu ve bağlandı',
        'success',
      );
    } catch (err) {
      addLog('ensureAccount:hata', err.message, 'error');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      addLog('updateCurrentAccount', `Profil güncelleniyor: ${newDisplayName}`);
      const result = await accountActions.updateCurrentAccount({
        displayName: newDisplayName,
        bio: newBio,
      });
      addLog('updateCurrentAccount:basarili', result || 'Profil güncellendi', 'success');
    } catch (err) {
      addLog('updateCurrentAccount:hata', err.message, 'error');
    }
  };

  const handleSyncEmail = async () => {
    try {
      addLog('syncCurrentAccountEmail', `E-posta eşitleniyor: ${newEmail}`);
      const result = await accountActions.syncCurrentAccountEmail(newEmail);
      addLog('syncCurrentAccountEmail:basarili', result || 'E-posta eşitlendi', 'success');
    } catch (err) {
      addLog('syncCurrentAccountEmail:hata', err.message, 'error');
    }
  };

  const handleRefresh = async () => {
    try {
      addLog('refreshCurrentAccount', 'Hesap bilgileri sunucudan yenileniyor...');
      const result = await accountActions.refreshCurrentAccount();
      addLog('refreshCurrentAccount:basarili', result || 'Hesap verisi tazelendi', 'success');
    } catch (err) {
      addLog('refreshCurrentAccount:hata', err.message, 'error');
    }
  };

  const handleClientGetMe = async () => {
    try {
      addLog('client.getMe', 'Hesap istemcisi getMe() sorgusu gönderiliyor...');
      const me =
        typeof accountClient?.getMe === 'function'
          ? await accountClient.getMe()
          : currentAccount?.id
            ? await accountClient.getAccount(currentAccount.id)
            : null;
      addLog('client.getMe:sonuc', me || 'Veri alındı (veya aktif profil yok)', 'info');
    } catch (err) {
      addLog('client.getMe:hata', err.message, 'error');
    }
  };

  const handleClientGetAccount = async () => {
    try {
      const targetId = currentAccount?.id || authUser?.id;
      if (!targetId) {
        addLog('client.getAccount:uyari', 'Önce kullanıcı simüle edin veya giriş yapın', 'warning');
        return;
      }
      addLog('client.getAccount', `getAccount("${targetId}") sorgusu gönderiliyor...`);
      const acc = await accountClient.getAccount(targetId);
      addLog('client.getAccount:sonuc', acc || 'Hesap bulundu', 'success');
    } catch (err) {
      addLog('client.getAccount:hata', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Hesap Durumu */}
      <Section
        title="Hesap Durumu"
        badge={hasAccount ? 'Bağlı' : isAuth ? 'Bekleniyor' : 'Misafir'}
        actions={
          <div className="flex items-center gap-2">
            {isAuth && !hasAccount && (
              <ActionBtn
                size="xs"
                onClick={handleEnsureFromAuth}
                variant="primary"
                icon="solar:user-plus-bold"
              >
                Hesabı Bağla
              </ActionBtn>
            )}
            <ActionBtn size="xs" onClick={handleRefresh} icon="solar:refresh-bold">
              Yenile
            </ActionBtn>
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <StateBadge
            label="Auth"
            value={isAuth ? 'Açık' : 'Kapalı'}
            variant={isAuth ? 'success' : 'neutral'}
          />
          <StateBadge
            label="Hesap"
            value={hasAccount ? 'Var' : 'Yok'}
            variant={hasAccount ? 'success' : 'warning'}
          />
          <StateBadge
            label="Profil"
            value={hasProfile ? 'Mevcut' : 'Yok'}
            variant={hasProfile ? 'success' : 'neutral'}
          />
          <StateBadge
            label="İsim"
            value={
              currentAccount?.displayName ||
              currentAccount?.profile?.displayName ||
              authUser?.displayName ||
              '—'
            }
            variant="info"
          />
          <StateBadge label="E-posta" value={currentAccount?.email || authUser?.email || '—'} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <JsonViewer data={accountState} title="useAccountState()" />
          <JsonViewer
            data={{
              isAuthenticated: authState.isAuthenticated,
              status: authState.status,
              user: authState.user,
              capabilities: authState.capabilities,
            }}
            title="useAuthState()"
          />
        </div>
      </Section>

      {/* Profil Düzenleme */}
      <Section title="Profil Düzenleme">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextInput label="Görünen İsim" value={newDisplayName} onChange={setNewDisplayName} />
          <TextInput label="Biyografi" value={newBio} onChange={setNewBio} />
          <TextInput label="E-posta" value={newEmail} onChange={setNewEmail} />
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionBtn onClick={handleUpdateProfile} variant="primary" icon="solar:pen-bold">
            Profili Güncelle
          </ActionBtn>
          <ActionBtn onClick={handleSyncEmail} icon="solar:letter-bold">
            E-postayı Eşitle
          </ActionBtn>
          <ActionBtn onClick={handleRefresh} icon="solar:refresh-circle-bold">
            Yenile
          </ActionBtn>
        </div>
      </Section>

      {/* Profil Çözümleme */}
      <Section title="Profil Çözümleme">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3.5">
            <TextInput label="Kullanıcı Adı" value={queryUsername} onChange={setQueryUsername} />
            <JsonViewer
              data={resolvedQueryUser || { mesaj: 'Bulunamadı' }}
              title={`useResolvedAccountUser("${queryUsername}")`}
            />
          </div>

          <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3.5">
            <TextInput
              label="Profil ID"
              value={profileSubscriptionId}
              onChange={setProfileSubscriptionId}
            />
            <JsonViewer
              data={subscribedProfile || { mesaj: 'Kayıt yok' }}
              title={`useAccountProfile("${profileSubscriptionId}")`}
            />
          </div>
        </div>
      </Section>

      {/* İstemci */}
      <Section title="İstemci (Client)">
        <div className="flex flex-wrap gap-2">
          <ActionBtn onClick={handleClientGetMe} icon="solar:user-id-bold">
            getMe() Çağır
          </ActionBtn>
          <ActionBtn onClick={handleClientGetAccount} icon="solar:user-bold">
            getAccount() Çağır
          </ActionBtn>
        </div>
      </Section>

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Logs" />
    </div>
  );
}
