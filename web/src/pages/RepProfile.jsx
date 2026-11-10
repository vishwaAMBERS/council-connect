import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Badge, Chip, Button, Modal, Field, useToast, Card, InitialsAvatar, VerifiedBadge, ErrorNote, Loading } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatTerm, formatDate, formatDateTime, ROLE_LABEL } from '../lib/format.js';
import { colors } from '../theme/theme.js';

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 400;
const ABOUT_MAX = 200;

/** Role-aware profile page for any user. Used for /council/:id and for the viewer's own /profile. */
export function UserProfileView({ userId }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshUser } = useAuth();
  const profile = useApi(`/users/${userId}`);

  const [requestOpen, setRequestOpen] = useState(false);
  const [reasonTitle, setReasonTitle] = useState('');
  const [description, setDescription] = useState('');
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [about, setAbout] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (profile.loading && !profile.data) return <div className="wrap"><Loading label="Loading profile…" /></div>;
  if (profile.error) {
    return (
      <div className="wrap center">
        <h2 className="page-title">{profile.error.status === 404 ? 'Profile not found' : 'Could not load this profile'}</h2>
        {profile.error.status !== 404 && <p className="muted" style={{ marginTop: 8 }}>{profile.error.message}</p>}
        <Link to="/council" className="btn-prim" style={{ marginTop: 16, display: 'inline-flex' }}>Back to Directory</Link>
      </div>
    );
  }

  const { user, councilProfiles, isSelf, contact } = profile.data;
  const firstName = user.fullName.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0];
  const isCouncilMember = councilProfiles.length > 0;

  const run = async (action, successMessage) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      toast(successMessage, 'success');
      await profile.reload();
      return true;
    } catch (error) {
      setActionError(error);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    const ok = await run(
      () => api.post('/contact-requests', { toUserId: user.id, reasonTitle: reasonTitle.trim(), description: description.trim() }),
      'Request sent. Awaiting approval'
    );
    if (ok) {
      setRequestOpen(false);
      setReasonTitle('');
      setDescription('');
    }
  };

  const confirmVerify = async () => {
    const ok = await run(() => api.post(`/council-profiles/${verifyTarget.profileId}/verify`), `${user.fullName} is now verified`);
    if (ok) setVerifyTarget(null);
  };

  const saveAbout = async (e) => {
    e.preventDefault();
    const ok = await run(() => api.patch('/users/me', { about }), 'Profile updated');
    if (ok) {
      setAboutOpen(false);
      refreshUser().catch(() => {});
    }
  };

  const openModal = (open) => {
    setActionError(null);
    open();
  };

  return (
    <div className="wrap">
      {!isSelf && (
        <div className="row mb-2" style={{ fontSize: '12px' }}>
          <Link to="/council" className="muted" style={{ textDecoration: 'none' }}>
            <i className="fas fa-arrow-left" style={{ marginRight: 5 }} /> Council Directory
          </Link>
        </div>
      )}

      <div className="grid-2" style={{ gap: '2rem', alignItems: 'start' }}>
        <Card accent pad style={{ textAlign: 'center' }}>
          <InitialsAvatar
            name={user.fullName}
            size={130}
            fontSize="2.4rem"
            style={{ margin: '0 auto 18px', border: '4px solid #fff', boxShadow: '0 10px 32px rgba(0,0,0,.12), 0 0 0 8px rgba(34,102,237,.07)' }}
          />
          <h1 className="page-title" style={{ fontSize: '1.5rem' }}>{user.fullName}</h1>
          <div className="row" style={{ justifyContent: 'center', margin: '8px 0 12px', flexWrap: 'wrap' }}>
            <Badge tone="blue" icon="id-badge">{ROLE_LABEL[user.role]}</Badge>
            {user.email && <Badge tone="gray" icon="envelope">{user.email}</Badge>}
          </div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>
            <i className="fas fa-graduation-cap" style={{ marginRight: 6, color: colors.blue }} />
            {user.unit ? user.unit.name : 'GECA'}{user.year ? ` · Year ${user.year}` : ''}
          </div>

          {/* Contact request: students only, on council members' profiles */}
          {contact && (
            <div style={{ marginTop: 22 }}>
              {contact.request?.status === 'pending' && (
                <Button lg variant="ghost" style={{ width: '100%' }} disabled>
                  <i className="fas fa-hourglass-half" /> Request Sent. Awaiting Approval
                </Button>
              )}
              {contact.request?.status === 'approved' && (
                <>
                  <Badge tone="green" icon="circle-check">Request approved. You can now message</Badge>
                  <Button lg style={{ width: '100%', marginTop: 10 }} onClick={() => navigate(`/messages?request=${contact.request.id}`)}>
                    <i className="fas fa-comments" /> Open Message Thread
                  </Button>
                </>
              )}
              {contact.request?.status === 'declined' && (
                <div style={{ marginBottom: 10 }}>
                  <Badge tone="red" icon="circle-xmark">Request declined</Badge>
                  {contact.canRequestAt && (
                    <p className="faint" style={{ fontSize: '11px', marginTop: 8 }}>
                      You can send a new request after {formatDateTime(contact.canRequestAt)}.
                    </p>
                  )}
                </div>
              )}
              {contact.canRequest && (
                <Button lg style={{ width: '100%' }} onClick={() => openModal(() => setRequestOpen(true))}>
                  <i className="fas fa-paper-plane" /> Send Contact Request
                </Button>
              )}
              <p className="faint" style={{ fontSize: '10.5px', marginTop: 10 }}>
                Messaging opens only after {firstName} approves your request.
              </p>
            </div>
          )}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {councilProfiles.map((cp) => (
            <Card pad key={cp.profileId}>
              <div className="spread" style={{ alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <Chip blue icon="medal">{cp.positionTitle}</Chip>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, marginTop: 10 }}>{cp.council.name}</div>
                  <div className="muted" style={{ fontSize: '0.78rem', marginTop: 4 }}>
                    <i className="fas fa-calendar" style={{ marginRight: 6, color: colors.blue }} />
                    Serving term: {formatTerm(cp.termStart, cp.termEnd)}
                  </div>
                </div>
                <VerifiedBadge verified={cp.isVerified} />
              </div>
              <div style={{ marginTop: 12, fontSize: '0.78rem', color: colors.charcoalMuted }}>
                {cp.isVerified ? (
                  <>
                    <i className="fas fa-shield-halved" style={{ marginRight: 6, color: colors.blue }} />
                    Verified by {cp.verifiedByName} on {formatDate(cp.verifiedAt)}
                  </>
                ) : (
                  'This appointment has not been verified yet.'
                )}
              </div>
              {cp.canVerify && (
                <Button style={{ marginTop: 14 }} onClick={() => openModal(() => setVerifyTarget(cp))}>
                  <i className="fas fa-user-check" /> Verify this Member
                </Button>
              )}
            </Card>
          ))}

          <Card pad>
            <div className="spread">
              <h2 className="page-title" style={{ fontSize: '1.2rem' }}>About</h2>
              {isSelf && (
                <Button variant="out" size="sm" onClick={() => openModal(() => { setAbout(user.about || ''); setAboutOpen(true); })}>
                  <i className="fas fa-pen" /> Edit
                </Button>
              )}
            </div>
            <p style={{ fontSize: '0.86rem', color: colors.charcoalSoft, lineHeight: 1.7, marginTop: 10, whiteSpace: 'pre-wrap' }}>
              {user.about || <span className="faint">{isSelf ? 'Add a short introduction so others know who you are.' : 'No introduction added yet.'}</span>}
            </p>
            {!isCouncilMember && user.role === 'representative' && (
              <p className="faint" style={{ fontSize: '0.75rem', marginTop: 10 }}>No active council position.</p>
            )}
          </Card>
        </div>
      </div>

      <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title={`Contact request to ${firstName}`}>
        <form onSubmit={submitRequest}>
          <ErrorNote error={actionError} />
          <Field label="Reason Title" hint={`${reasonTitle.length}/${TITLE_MAX}`}>
            <input
              className="input"
              placeholder="e.g. Attendance shortage, request review"
              value={reasonTitle}
              onChange={(e) => setReasonTitle(e.target.value)}
              maxLength={TITLE_MAX}
              required
              autoFocus
            />
          </Field>
          <Field label="Description" hint={`${description.length}/${DESCRIPTION_MAX}`}>
            <textarea
              className="textarea"
              placeholder="Explain your concern so the representative can decide how to help."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESCRIPTION_MAX}
              required
            />
          </Field>
          <p className="faint" style={{ fontSize: '11px', marginBottom: 12 }}>
            <i className="fas fa-robot" style={{ marginRight: 5 }} />
            Your request is categorised automatically (Academic, Personal, Event or Urgent) to help the representative prioritise.
          </p>
          <div className="row">
            <Button type="submit" disabled={busy || !reasonTitle.trim() || !description.trim()}>
              <i className="fas fa-paper-plane" /> {busy ? 'Sending…' : 'Submit Request'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRequestOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(verifyTarget)} onClose={() => setVerifyTarget(null)} title="Verify this member?">
        {verifyTarget && (
          <>
            <ErrorNote error={actionError} />
            <p style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>
              You are confirming that <strong>{user.fullName}</strong> holds the position of{' '}
              <strong>{verifyTarget.positionTitle}</strong> in the <strong>{verifyTarget.council.name}</strong>.
            </p>
            <p className="muted" style={{ fontSize: '0.78rem', margin: '10px 0 16px' }}>
              Verification is recorded in the audit log under your name and cannot be undone.
            </p>
            <div className="row">
              <Button onClick={confirmVerify} disabled={busy}>
                <i className="fas fa-check" /> {busy ? 'Verifying…' : 'Confirm Verification'}
              </Button>
              <Button variant="ghost" onClick={() => setVerifyTarget(null)}>Cancel</Button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} title="Edit About">
        <form onSubmit={saveAbout}>
          <ErrorNote error={actionError} />
          <Field label="About" hint={`${about.length}/${ABOUT_MAX}`}>
            <textarea className="textarea" value={about} onChange={(e) => setAbout(e.target.value)} maxLength={ABOUT_MAX} autoFocus />
          </Field>
          <div className="row">
            <Button type="submit" disabled={busy}><i className="fas fa-check" /> {busy ? 'Saving…' : 'Save'}</Button>
            <Button type="button" variant="ghost" onClick={() => setAboutOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function RepProfile() {
  const { id } = useParams();
  return <UserProfileView key={id} userId={id} />;
}
