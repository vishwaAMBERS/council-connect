import React, { useEffect, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useAuth } from '../auth';
import { api } from '../api';
import { formatDate, formatDateTime, formatTerm, ROLE_LABEL } from '../format';
import { Avatar, Badge, Body, Btn, Card, ChipSelect, Empty, ErrorNote, Field, Loading, Muted, Row, Screen, Title, useApi } from '../ui';

const VerifiedBadge = ({ verified }) => <Badge tone={verified ? 'green' : 'gray'}>{verified ? 'Verified' : 'Unverified'}</Badge>;

/** Asks for confirmation; Alert has no buttons on the web build, so that uses window.confirm. */
export function confirmAction(title, message, onConfirm) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: onConfirm }]);
}

export function DirectoryScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [unit, setUnit] = useState('');
  const [position, setPosition] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const meta = useApi('/meta');
  const query = [debounced && `search=${encodeURIComponent(debounced)}`, unit && `unit=${unit}`, position && `position=${position}`].filter(Boolean).join('&');
  const directory = useApi(`/directory?${query}`);
  const members = directory.data?.members || [];

  return (
    <Screen source={directory}>
      <Field label="Search" placeholder="Name or position" value={search} onChangeText={setSearch} autoCorrect={false} />
      <ChipSelect
        label="Branch"
        value={unit}
        onChange={setUnit}
        options={[{ value: '', label: 'All' }, { value: 'MAIN', label: 'Main council' }, ...(meta.data?.units || []).map((u) => ({ value: u.code, label: u.code }))]}
      />
      <ChipSelect
        label="Position"
        value={position}
        onChange={setPosition}
        options={[{ value: '', label: 'All' }, ...(meta.data?.positionGroups || []).map((g) => ({ value: g.key, label: g.label }))]}
      />
      <ErrorNote error={directory.error} onRetry={directory.reload} />
      {directory.loading && !directory.data ? (
        <Loading />
      ) : members.length === 0 && !directory.error ? (
        <Empty title="No council members found" desc="Try a different search or clear the filters." />
      ) : (
        <>
          <Muted style={{ marginBottom: 8 }}>{members.length} member{members.length === 1 ? '' : 's'}</Muted>
          {members.map((m) => (
            <Card key={m.profileId} onPress={() => navigation.navigate('UserProfile', { userId: m.userId, name: m.fullName })} label={`${m.fullName}, ${m.positionTitle}`}>
              <Row style={{ flexWrap: 'nowrap', gap: 12 }}>
                <Avatar name={m.fullName} src={m.avatarUrl} />
                <View style={{ flex: 1 }}>
                  <Title>{m.fullName}</Title>
                  <Muted>{m.positionTitle} · {m.unit ? m.unit.code : 'Main council'}</Muted>
                  <Muted>{formatTerm(m.termStart, m.termEnd)}</Muted>
                </View>
                <VerifiedBadge verified={m.isVerified} />
              </Row>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

/** Role-aware profile for any user. With no userId it shows the signed-in user's own profile. */
export function UserProfileScreen({ route, navigation }) {
  const { user: me, logout, refreshUser } = useAuth();
  const userId = route.params?.userId || me.id;
  const profile = useApi(`/users/${userId}`);
  const [form, setForm] = useState(null); // 'request' | 'about' | null
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (profile.loading && !profile.data) return <Screen><Loading /></Screen>;
  if (!profile.data) return <Screen><ErrorNote error={profile.error} onRetry={profile.reload} /></Screen>;

  const { user, councilProfiles, isSelf, contact } = profile.data;
  const firstName = user.fullName.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0];

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setForm(null);
      setTitle('');
      setText('');
      await profile.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const open = (name, initialText = '') => {
    setError(null);
    setTitle('');
    setText(initialText);
    setForm(name);
  };

  const verify = (cp) =>
    confirmAction(
      'Verify this member?',
      `You are confirming that ${user.fullName} holds the position of ${cp.positionTitle} in the ${cp.council.name}. This is recorded under your name and cannot be undone.`,
      () => run(() => api.post(`/council-profiles/${cp.profileId}/verify`))
    );

  return (
    <Screen source={profile}>
      <Card style={{ alignItems: 'center' }}>
        <Avatar name={user.fullName} src={user.avatarUrl} size={96} />
        <Title style={{ fontSize: 22, marginTop: 12 }}>{user.fullName}</Title>
        <Row style={{ marginTop: 8, justifyContent: 'center' }}>
          <Badge>{ROLE_LABEL[user.role]}</Badge>
        </Row>
        <Muted style={{ marginTop: 8 }}>{user.unit ? user.unit.name : 'GECA'}{user.year ? ` · Year ${user.year}` : ''}</Muted>
        {user.email ? <Muted>{user.email}</Muted> : null}
      </Card>

      {!form && <ErrorNote error={error} />}

      {/* Contact request: students only, on council members' profiles */}
      {contact && form !== 'request' && (
        <Card>
          {contact.request?.status === 'pending' && <Badge tone="gold">Request sent. Awaiting approval</Badge>}
          {contact.request?.status === 'approved' && (
            <>
              <Badge tone="green">Request approved. You can now message</Badge>
              <Btn title="Open message thread" style={{ marginTop: 12 }} onPress={() => navigation.navigate('Inbox', { screen: 'Thread', params: { requestId: contact.request.id }, initial: false })} />
            </>
          )}
          {contact.request?.status === 'declined' && (
            <>
              <Badge tone="red">Request declined</Badge>
              {contact.canRequestAt ? <Muted style={{ marginTop: 8 }}>You can send a new request after {formatDateTime(contact.canRequestAt)}.</Muted> : null}
            </>
          )}
          {contact.canRequest && <Btn title="Send contact request" style={{ marginTop: contact.request ? 12 : 0 }} onPress={() => open('request')} />}
          <Muted style={{ marginTop: 10 }}>Messaging opens only after {firstName} approves your request.</Muted>
        </Card>
      )}

      {form === 'request' && (
        <Card>
          <Title style={{ marginBottom: 12 }}>Contact request to {firstName}</Title>
          <ErrorNote error={error} />
          <Field label="Reason title" hint={`${title.length}/80`} value={title} onChangeText={setTitle} maxLength={80} placeholder="e.g. Attendance shortage, request review" />
          <Field label="Description" hint={`${text.length}/400`} value={text} onChangeText={setText} maxLength={400} multiline placeholder="Explain your concern so the representative can decide how to help." />
          <Muted style={{ marginBottom: 12 }}>Your request is categorised automatically (Academic, Personal, Event or Urgent).</Muted>
          <Row>
            <Btn title={busy ? 'Sending…' : 'Submit request'} disabled={busy || !title.trim() || !text.trim()} onPress={() => run(() => api.post('/contact-requests', { toUserId: user.id, reasonTitle: title.trim(), description: text.trim() }))} />
            <Btn title="Cancel" variant="ghost" onPress={() => setForm(null)} />
          </Row>
        </Card>
      )}

      {councilProfiles.map((cp) => (
        <Card key={cp.profileId}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Badge>{cp.positionTitle}</Badge>
            <VerifiedBadge verified={cp.isVerified} />
          </Row>
          <Title style={{ marginTop: 10, fontSize: 15 }}>{cp.council.name}</Title>
          <Muted>Serving term: {formatTerm(cp.termStart, cp.termEnd)}</Muted>
          <Muted style={{ marginTop: 6 }}>
            {cp.isVerified ? `Verified by ${cp.verifiedByName} on ${formatDate(cp.verifiedAt)}` : 'This appointment has not been verified yet.'}
          </Muted>
          {cp.canVerify && <Btn title="Verify this member" style={{ marginTop: 12 }} disabled={busy} onPress={() => verify(cp)} />}
        </Card>
      ))}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Title>About</Title>
          {isSelf && form !== 'about' && <Btn title="Edit" small variant="outline" onPress={() => open('about', user.about || '')} />}
        </Row>
        {form === 'about' ? (
          <View style={{ marginTop: 12 }}>
            <ErrorNote error={error} />
            <Field hint={`${text.length}/200`} value={text} onChangeText={setText} maxLength={200} multiline accessibilityLabel="About" />
            <Row>
              <Btn title={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={() => run(async () => { await api.patch('/users/me', { about: text }); await refreshUser(); })} />
              <Btn title="Cancel" variant="ghost" onPress={() => setForm(null)} />
            </Row>
          </View>
        ) : (
          <Body style={{ marginTop: 8 }}>{user.about || (isSelf ? 'Add a short introduction so others know who you are.' : 'No introduction added yet.')}</Body>
        )}
      </Card>

      {isSelf && <Btn title="Log out" variant="ghost" onPress={logout} />}
    </Screen>
  );
}
