import { useEffect, useState } from 'react';

import { Storage } from '@plasmohq/storage';
import { useStorage } from '@plasmohq/storage/hook';

const storage = new Storage();

function OptionsPage() {
  const [apiEndpoint, setApiEndpoint] = useStorage('apiEndpoint', '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState({ captureCount: 0, errorCount: 0 });

  // Load stats on component mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const captureCountRaw = await storage.get('captureCount');
      const errorCountRaw = await storage.get('errorCount');
      const captureCount = Number(captureCountRaw);
      const errorCount = Number(errorCountRaw);
      setStats({
        captureCount: isNaN(captureCount) ? 0 : captureCount,
        errorCount: isNaN(errorCount) ? 0 : errorCount,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await storage.set('apiEndpoint', apiEndpoint.trim());
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save API endpoint:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleTest = async () => {
    if (!apiEndpoint.trim()) {
      alert('Please enter an API endpoint first');
      return;
    }

    setTestStatus('testing');
    try {
      const testPayload = {
        postId: 'test-post-id',
        content: 'This is a test post to verify API connectivity',
        author: 'Test Author',
        authorUrl: 'https://linkedin.com/in/test',
        postUrl: 'https://linkedin.com/feed/test',
        timestamp: new Date().toISOString(),
        mediaType: 'text',
        capturedAt: new Date().toISOString(),
        source: 'linkedin-ai-assistant',
        isTest: true,
      };

      const response = await fetch(apiEndpoint.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LinkedIn-AI-Assistant-Extension/1.0',
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('API test failed:', error);
      setTestStatus('error');
      alert(`API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  const resetStats = async () => {
    if (confirm('Are you sure you want to reset statistics?')) {
      try {
        await storage.set('captureCount', 0);
        await storage.set('errorCount', 0);
        setStats({ captureCount: 0, errorCount: 0 });
      } catch (error) {
        console.error('Failed to reset stats:', error);
      }
    }
  };

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#0a66c2', marginBottom: '10px' }}>LinkedIn AI Comment Assistant</h1>
        <p style={{ color: '#666', margin: 0 }}>
          Configure your API endpoint to capture LinkedIn posts for AI-assisted commenting.
        </p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <label
          htmlFor="apiEndpoint"
          style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#333',
          }}
        >
          API Endpoint URL
        </label>
        <input
          id="apiEndpoint"
          type="url"
          value={apiEndpoint}
          onChange={e => setApiEndpoint(e.target.value)}
          placeholder="https://your-api-endpoint.com/capture"
          style={{
            width: '100%',
            padding: '12px',
            border: '2px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        />
        <p
          style={{
            fontSize: '12px',
            color: '#666',
            margin: '4px 0 0 0',
          }}
        >
          The extension will POST captured LinkedIn post data to this endpoint.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '30px',
          alignItems: 'center',
        }}
      >
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          style={{
            padding: '12px 24px',
            backgroundColor: saveStatus === 'saved' ? '#057642' : '#0a66c2',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
            opacity: saveStatus === 'saving' ? 0.7 : 1,
          }}
        >
          {saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'saved'
              ? '✓ Saved'
              : 'Save Configuration'}
        </button>

        <button
          onClick={handleTest}
          disabled={testStatus === 'testing' || !apiEndpoint.trim()}
          style={{
            padding: '12px 24px',
            backgroundColor: testStatus === 'success' ? '#057642' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: testStatus === 'testing' || !apiEndpoint.trim() ? 'not-allowed' : 'pointer',
            opacity: testStatus === 'testing' || !apiEndpoint.trim() ? 0.7 : 1,
          }}
        >
          {testStatus === 'testing'
            ? 'Testing...'
            : testStatus === 'success'
              ? '✓ Test Passed'
              : 'Test API'}
        </button>
      </div>

      {saveStatus === 'error' && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fee',
            color: '#c41e3a',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
          }}
        >
          Failed to save configuration. Please try again.
        </div>
      )}

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: '6px',
          padding: '20px',
          backgroundColor: '#f9f9f9',
        }}
      >
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Statistics</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
          }}
        >
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0a66c2' }}>
              {stats.captureCount}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Posts Captured</div>
          </div>
          <div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: stats.errorCount > 0 ? '#c41e3a' : '#666',
              }}
            >
              {stats.errorCount}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Errors</div>
          </div>
        </div>
        <button
          onClick={resetStats}
          style={{
            marginTop: '15px',
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Reset Statistics
        </button>
      </div>

      <div
        style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#e8f4fd',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#0a66c2',
        }}
      >
        <strong>How it works:</strong>
        <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Navigate to LinkedIn feed</li>
          <li>Click &quot;AI Capture&quot; button on any post</li>
          <li>Post data is sent to your configured API endpoint</li>
          <li>Use the captured data for AI-assisted commenting</li>
        </ol>
      </div>
    </div>
  );
}

export default OptionsPage;
