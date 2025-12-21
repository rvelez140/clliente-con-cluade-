import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import Sidebar from '../components/Sidebar';
import EmailList from '../components/EmailList';
import EmailViewer from '../components/EmailViewer';
import EmailComposer from '../components/EmailComposer';
import ScheduledEmailComposer from '../components/ScheduledEmailComposer';
import ScheduledEmailList from '../components/ScheduledEmailList';
import { Email, EmailAccount } from '../types';
import { emailApi } from '../services/api';

const Home: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [scheduledComposerOpen, setScheduledComposerOpen] = useState(false);
  const [showScheduledEmails, setShowScheduledEmails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await emailApi.getAccounts();
      setAccounts(response.data);
      if (response.data.length > 0) {
        loadEmails(response.data[0].id);
      }
    } catch (error) {
      console.error('Error cargando cuentas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async (accountId: string) => {
    try {
      const response = await emailApi.getEmails(accountId);
      setEmails(response.data);
    } catch (error) {
      console.error('Error cargando correos:', error);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        onCompose={() => setComposerOpen(true)}
        onScheduleEmail={() => setScheduledComposerOpen(true)}
        onScheduledEmails={() => setShowScheduledEmails(!showScheduledEmails)}
      />
      {showScheduledEmails ? (
        <ScheduledEmailList />
      ) : (
        <>
          <EmailList
            emails={emails}
            selectedEmail={selectedEmail}
            onSelectEmail={setSelectedEmail}
          />
          <EmailViewer
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
            onReply={() => {
              setComposerOpen(true);
            }}
          />
        </>
      )}
      <EmailComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        accountId={accounts[0]?.id}
        replyTo={selectedEmail}
      />
      <ScheduledEmailComposer
        open={scheduledComposerOpen}
        onClose={() => setScheduledComposerOpen(false)}
        accountId={accounts[0]?.id}
      />
    </Box>
  );
};

export default Home;
