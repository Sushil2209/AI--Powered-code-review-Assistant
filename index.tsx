import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from '@google/genai';

// --- Helper Types ---
type AnalysisIssue = {
  line: number;
  issue: string;
  suggestion: string;
};

type AnalysisResult = {
  score: number;
  summary: string;
  issues: AnalysisIssue[];
  optimizedCode: string;
};

// --- Main Application Component ---
const App = () => {
  // --- State Management ---
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('javascript');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Auto-detect language
    const extension = file.name.split('.').pop()?.toLowerCase();
    const langMap: { [key: string]: string } = {
        js: 'javascript',
        py: 'python',
        ts: 'typescript',
        java: 'java',
        cs: 'csharp',
        cpp: 'cpp',
        go: 'go',
        rs: 'rust'
    };
    if (extension && langMap[extension]) {
        setLanguage(langMap[extension]);
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
            setCode(text);
        }
    };
    reader.onerror = (e) => {
        console.error("Error reading file:", e);
        setError("Failed to read the uploaded file.");
    }
    reader.readAsText(file);

    // Reset the input value to allow uploading the same file again
    event.target.value = '';
  };


  // --- Gemini API Call ---
  const analyzeCode = async () => {
    if (!code.trim()) {
      setError('Please enter some code to analyze.');
      return;
    }
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const analysisSchema = {
        type: Type.OBJECT,
        properties: {
          score: {
            type: Type.INTEGER,
            description: 'Overall code quality score from 0 to 100.'
          },
          summary: {
            type: Type.STRING,
            description: 'A brief summary of the code quality and key findings.'
          },
          issues: {
            type: Type.ARRAY,
            description: 'A list of issues found in the code.',
            items: {
              type: Type.OBJECT,
              properties: {
                line: {
                  type: Type.INTEGER,
                  description: 'The line number where the issue occurs.'
                },
                issue: {
                  type: Type.STRING,
                  description: 'A short description of the issue.'
                },
                suggestion: {
                  type: Type.STRING,
                  description: 'A concrete suggestion for how to fix the issue.'
                }
              },
               required: ['line', 'issue', 'suggestion'],
            }
          },
          optimizedCode: {
            type: Type.STRING,
            description: 'An improved and optimized version of the entire code snippet.'
          }
        },
        required: ['score', 'summary', 'issues', 'optimizedCode'],
      };

      const prompt = `
        You are an expert code reviewer. Analyze the following ${language} code for errors, code smells, performance issues, and best practice violations. Provide:
        1. An overall code quality score from 0 to 100.
        2. A list of specific issues found, including the line number, a description of the issue, and a suggested fix.
        3. An optimized version of the entire code block.
        4. A summary of the findings in plain English.

        Code to review:
        \`\`\`${language}
        ${code}
        \`\`\`
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: analysisSchema,
        }
      });

      const jsonText = response.text.trim();
      const parsedResult: AnalysisResult = JSON.parse(jsonText);
      setResult(parsedResult);

    } catch (e) {
      console.error(e);
      setError('An error occurred while analyzing the code. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Rendering ---
  return (
    <>
      <style>{`
        :root {
          --font-primary: 'Roboto', sans-serif;
          --font-mono: 'Roboto Mono', monospace;
        }

        [data-theme='dark'] {
          --background-color: #121212;
          --surface-color: #1e1e1e;
          --primary-color: #03dac6;
          --primary-hover-color: #01bfa5;
          --on-primary-color: #000000;
          --secondary-color: #bb86fc;
          --on-background-color: #e0e0e0;
          --on-surface-color: #ffffff;
          --error-color: #cf6679;
          --border-color: #333333;
          --placeholder-color: #888;
          --disabled-color: #555;
          --score-card-bg: #2a2a2a;
          --scrollbar-thumb: #555;
          --scrollbar-thumb-hover: #777;
        }

        [data-theme='light'] {
          --background-color: #f5f5f5;
          --surface-color: #ffffff;
          --primary-color: #6200ee;
          --primary-hover-color: #3700b3;
          --on-primary-color: #ffffff;
          --secondary-color: #018786;
          --on-background-color: #212121;
          --on-surface-color: #000000;
          --error-color: #b00020;
          --border-color: #e0e0e0;
          --placeholder-color: #757575;
          --disabled-color: #bdbdbd;
          --score-card-bg: #eeeeee;
          --scrollbar-thumb: #bdbdbd;
          --scrollbar-thumb-hover: #9e9e9e;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: var(--font-primary);
          background-color: var(--background-color);
          color: var(--on-background-color);
          line-height: 1.6;
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        .container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          padding: 1.5rem;
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-align: center;
          margin-bottom: 1.5rem;
          position: relative;
        }
        header h1 {
          font-size: 2.5rem;
          font-weight: 300;
          color: var(--on-surface-color);
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }
        .theme-toggle {
            background: none;
            border: 1px solid var(--border-color);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: auto;
            color: var(--on-background-color);
            transition: background-color 0.3s, border-color 0.3s;
        }
        .theme-toggle:hover {
            background-color: var(--surface-color);
        }
        .theme-toggle svg {
            width: 20px;
            height: 20px;
        }

        .main-content {
          display: flex;
          flex: 1;
          gap: 1.5rem;
          overflow: hidden;
        }
        .panel {
          background-color: var(--surface-color);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1.5rem;
          width: 50%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: background-color 0.3s, border-color 0.3s;
        }
        .panel-title {
          font-size: 1.25rem;
          font-weight: 500;
          margin-bottom: 1rem;
          color: var(--secondary-color);
        }
        .input-panel .controls {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          height: 100%;
        }
        .control-row {
            display: flex;
            gap: 1rem;
            align-items: flex-end;
        }
        .language-control {
            flex-grow: 1;
        }
        .upload-button {
            padding: 0.75rem 1rem;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background-color: var(--surface-color);
            color: var(--on-surface-color);
            font-size: 0.9rem;
            font-family: var(--font-primary);
            cursor: pointer;
            transition: background-color 0.3s ease, border-color 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            white-space: nowrap;
        }
        .upload-button:hover {
            background-color: var(--background-color);
            border-color: var(--primary-color);
        }
        .upload-button svg {
            width: 18px;
            height: 18px;
        }
        label {
          font-weight: 500;
        }
        select, textarea {
          width: 100%;
          padding: 0.75rem;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          background-color: var(--background-color);
          color: var(--on-background-color);
          font-family: var(--font-mono);
          font-size: 0.9rem;
          transition: background-color 0.3s, border-color 0.3s, color 0.3s;
        }
        textarea {
          flex-grow: 1;
          resize: none;
          min-height: 300px;
        }
        .analyze-button {
          padding: 0.8rem 1.5rem;
          border: none;
          border-radius: 4px;
          background-color: var(--primary-color);
          color: var(--on-primary-color);
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        .analyze-button:hover:not(:disabled) {
          background-color: var(--primary-hover-color);
        }
        .analyze-button:disabled {
          background-color: var(--disabled-color);
          cursor: not-allowed;
        }
        .results-placeholder, .loader, .error {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: var(--placeholder-color);
        }
        .error {
          color: var(--error-color);
        }
        .results-panel .content {
          flex: 1;
          overflow-y: auto;
        }
        .results-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          height: 100%;
          overflow-y: auto;
          padding-right: 10px; /* space for scrollbar */
        }
        .score-card {
          text-align: center;
          background: var(--score-card-bg);
          padding: 1rem;
          border-radius: 8px;
          transition: background-color 0.3s;
        }
        .score-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          font-weight: bold;
          color: var(--on-surface-color);
          border: 5px solid;
          transition: color 0.3s;
        }
        .score-card h3 {
          margin-top: 0.5rem;
          font-weight: 400;
        }
        .issues-table {
          width: 100%;
          border-collapse: collapse;
        }
        .issues-table th, .issues-table td {
          text-align: left;
          padding: 0.8rem;
          border-bottom: 1px solid var(--border-color);
          transition: border-color 0.3s;
        }
        .issues-table th {
          color: var(--secondary-color);
        }
        .issues-table td:first-child {
          text-align: center;
          font-weight: bold;
          font-family: var(--font-mono);
        }
        .code-block {
          background-color: var(--background-color);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 1rem;
          overflow-x: auto;
          transition: background-color 0.3s, border-color 0.3s;
        }
        .code-block pre {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .code-block code {
          font-family: var(--font-mono);
        }
        
        /* For Webkit scrollbars */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: var(--surface-color);
        }
        ::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover);
        }

        @media (max-width: 768px) {
          .main-content {
            flex-direction: column;
          }
          .panel {
            width: 100%;
            height: 50%;
            min-height: 400px;
          }
          .container {
            height: auto;
            padding: 1rem;
          }
          header h1 {
            font-size: 1.8rem;
            position: static;
            transform: none;
            margin-bottom: 1rem;
          }
          header {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="container" data-theme={theme}>
        <header>
          <h1>AI-Powered Code Review Assistant</h1>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
            )}
            </button>
        </header>
        <main className="main-content">
          <div className="panel input-panel">
            <div className="controls">
              <div className="control-row">
                <div className="language-control">
                    <label htmlFor="language-select">Language</label>
                    <select
                        id="language-select"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="typescript">TypeScript</option>
                        <option value="java">Java</option>
                        <option value="csharp">C#</option>
                        <option value="cpp">C++</option>
                        <option value="go">Go</option>
                        <option value="rust">Rust</option>
                    </select>
                </div>
                <button className="upload-button" onClick={handleUploadClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    Upload File
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    accept=".js,.py,.ts,.java,.cs,.cpp,.go,.rs"
                />
              </div>

              <label htmlFor="code-input">Code</label>
              <textarea
                id="code-input"
                placeholder="Paste your code here or upload a file..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                aria-label="Code Input"
              />
               <button className="analyze-button" onClick={analyzeCode} disabled={isLoading || !code.trim()}>
                {isLoading ? 'Analyzing...' : 'Analyze Code'}
              </button>
            </div>
          </div>

          <div className="panel results-panel">
            <div className="content">
              {isLoading && <div className="loader">Analyzing... Please wait.</div>}
              {error && <div className="error">{error}</div>}
              {!isLoading && !result && !error && (
                <div className="results-placeholder">Your analysis will appear here.</div>
              )}
              {result && (
                <div className="results-content">
                  <div className="score-card">
                      <div className="score-circle" style={{ borderColor: result.score > 85 ? '#4CAF50' : result.score > 60 ? '#FFC107' : '#F44336' }}>
                      {result.score}
                    </div>
                    <h3>Overall Score</h3>
                  </div>

                  <div>
                    <h3 className="panel-title">Summary</h3>
                    <p>{result.summary}</p>
                  </div>

                  {result.issues.length > 0 && (
                    <div>
                      <h3 className="panel-title">Issues Found</h3>
                      <table className="issues-table">
                        <thead>
                          <tr>
                            <th>Line</th>
                            <th>Issue</th>
                            <th>Suggestion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.issues.map((issue, index) => (
                            <tr key={index}>
                              <td>{issue.line}</td>
                              <td>{issue.issue}</td>
                              <td>{issue.suggestion}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div>
                    <h3 className="panel-title">Optimized Code</h3>
                    <div className="code-block">
                      <pre><code>{result.optimizedCode}</code></pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

// --- Mount the application ---
const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);