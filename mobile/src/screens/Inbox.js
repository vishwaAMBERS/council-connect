import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useAuth } from '../auth';
import { api } from '../api';
import { formatDateTime, REQUEST_CATEGORY, STATUS_TONE, timeAgo, titleCase } from '../format';
import { Avatar, Badge, Body, Btn, Bubbles, Card, Empty, ErrorNote, Field, Loading, Muted, Row, Screen, Title, useApi } from '../ui';

const LIST_POLL_MS = 15000;
const THREAD_POLL_MS = 10000;

/** AI category tag; a request has none for a moment after it is sent. */
const CategoryBadge = ({ category }) => {
  const meta = REQUEST_CATEGORY[category];
  return meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : <Badge tone="gray">Categorising…</Badge>;
};

/** Representatives see requests addressed to them; students see the requests they sent. */
export function InboxScreen({ navigation }) {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const list = useApi(isStudent ? '/contact-requests/mine' : '/contact-requests/inbox', { pollMs: LIST_POLL_MS });
  const requests = list.data?.requests || [];
  const other = (r) => (isStudent ? r.to : r.from);

  return (
    <Screen source={list}>
      <Muted style={{ marginBottom: 12 }}>
        {isStudent
          ? 'Requests you sent to council representatives. Messaging opens once a request is approved.'
          : 'Students must send a contact request first. Approve one to open a message thread.'}
      </Muted>
      <ErrorNote error={list.error} onRetry={list.reload} />
      {list.loading && !list.data ? (
        <Loading />
      ) : requests.length === 0 && !list.error ? (
        <Empty title={isStudent ? 'No requests yet' : 'No contact requests'} desc={isStudent ? 'Find a representative in the Directory tab and send a contact request.' : 'Requests from students will appear here.'} />
      ) : (
        requests.map((r) => (
          <Card key={r.id} onPress={() => navigation.navigate('Thread', { requestId: r.id })} label={`${other(r).fullName}: ${r.reasonTitle}, ${r.status}`}>
            <Row style={{ flexWrap: 'nowrap', gap: 12, alignItems: 'flex-start' }}>
              <Avatar name={other(r).fullName} size={42} />
              <View style={{ flex: 1 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Title style={{ fontSize: 15 }}>{other(r).fullName}</Title>
                  <Muted>{timeAgo(r.lastMessageAt || r.createdAt)}</Muted>
                </Row>
                <Muted>{isStudent ? r.to.positionTitle || 'Representative' : [r.from.unitCode, r.from.year && `Year ${r.from.year}`].filter(Boolean).join(' · ')}</Muted>
                <Body style={{ marginVertical: 6, fontWeight: '600' }}>{r.reasonTitle}</Body>
                <Row>
                  <CategoryBadge category={r.category} />
                  <Badge tone={STATUS_TONE[r.status]}>{titleCase(r.status)}</Badge>
                </Row>
              </View>
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}

/** One request: its details, approve / decline for the representative, and the message thread once approved. */
export function ThreadScreen({ route }) {
  const { user } = useAuth();
  const { requestId } = route.params;
  const request = useApi(`/contact-requests/${requestId}`, { pollMs: LIST_POLL_MS });
  const r = request.data?.request;
  const thread = useApi(r?.status === 'approved' ? `/contact-requests/${requestId}/messages` : null, { pollMs: THREAD_POLL_MS });
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (request.loading && !r) return <Screen><Loading /></Screen>;
  if (!r) return <Screen><ErrorNote error={request.error} onRetry={request.reload} /></Screen>;

  const isRecipient = r.to.id === user.id;
  const other = isRecipient ? r.from : r.to;
  const messages = thread.data?.messages || [];

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await Promise.all([request.reload(), thread.reload()]);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    const content = reply.trim();
    if (!content || busy) return;
    run(async () => {
      await api.post(`/contact-requests/${requestId}/messages`, { content });
      setReply('');
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Screen source={request}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Title>{other.fullName}</Title>
            <Row>
              <CategoryBadge category={r.category} />
              <Badge tone={STATUS_TONE[r.status]}>{titleCase(r.status)}</Badge>
            </Row>
          </Row>
          <Muted>Sent {formatDateTime(r.createdAt)}</Muted>
          <Body style={{ fontWeight: '700', marginTop: 10 }}>{r.reasonTitle}</Body>
          <Body>{r.description}</Body>
        </Card>

        <ErrorNote error={error || thread.error} />

        {r.status === 'pending' && (isRecipient ? (
          <Card>
            <Muted style={{ marginBottom: 12 }}>Approving opens a private message thread with this student. Declining closes the request.</Muted>
            <Row>
              <Btn title="Approve" disabled={busy} onPress={() => run(() => api.post(`/contact-requests/${requestId}/approve`))} />
              <Btn title="Decline" variant="danger" disabled={busy} onPress={() => run(() => api.post(`/contact-requests/${requestId}/decline`))} />
            </Row>
          </Card>
        ) : (
          <Muted>Request sent. Awaiting approval from {r.to.fullName}.</Muted>
        ))}

        {r.status === 'declined' && (
          <Muted>{isRecipient ? 'You declined this request.' : 'This request was declined. You can send a new one 24 hours after the decline.'}</Muted>
        )}

        {r.status === 'approved' && (
          <>
            {thread.loading && !thread.data ? <Loading label="Loading messages…" /> : null}
            {thread.data && messages.length === 0 ? <Muted style={{ textAlign: 'center', marginVertical: 12 }}>Request approved. Start the conversation.</Muted> : null}
            <Bubbles messages={messages} meId={user.id} formatTime={formatDateTime} />
            <View style={{ marginTop: 16 }}>
              <Field placeholder="Type a message…" accessibilityLabel="Message" value={reply} onChangeText={setReply} maxLength={1000} multiline style={{ minHeight: 48 }} />
              <Btn title={busy ? 'Sending…' : 'Send'} disabled={busy || !reply.trim()} onPress={send} />
            </View>
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
