import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sun, Moon, Copy, Printer, Trash2, ChevronUp, ChevronDown, PenSquare, Music } from 'lucide-react';

// --- Constants ---
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
const MAJOR_CHORD_TYPES = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
const MINOR_CHORD_TYPES = ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'];

// --- Helper Functions ---
const getScaleChords = (key, scaleType) => {
    const rootNoteIndex = NOTES.indexOf(key);
    const intervals = scaleType === 'major' ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;
    const chordTypes = scaleType === 'major' ? MAJOR_CHORD_TYPES : MINOR_CHORD_TYPES;
    return intervals.map((interval, i) => {
        const noteIndex = (rootNoteIndex + interval) % 12;
        let chordName = NOTES[noteIndex];
        if (chordTypes[i] === 'minor') chordName += 'm';
        if (chordTypes[i] === 'diminished') chordName += 'dim';
        return { name: chordName, type: chordTypes[i] };
    });
};

const transposeChord = (chordName, amount) => {
    const rootRegex = /^[A-G]#?/;
    const match = chordName.match(rootRegex);
    if (!match) return chordName;
    const root = match[0];
    const quality = chordName.substring(root.length);
    const currentIndex = NOTES.indexOf(root);
    if (currentIndex === -1) return chordName;
    const newIndex = (currentIndex + amount + 12) % 12;
    const newRoot = NOTES[newIndex];
    return newRoot + quality;
};

// --- Components ---

const Toast = ({ message, show }) => {
    if (!show) return null;
    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-black py-2 px-6 rounded-lg shadow-lg z-50 transition-opacity duration-300">
            {message}
        </div>
    );
};

const ChordButton = ({ chord, index, onArm, isActive }) => (
    <button
        className={`relative flex items-center justify-center px-3 py-2 rounded-lg font-semibold shadow-sm border transition-all duration-200 text-sm
            ${isActive 
                ? 'transform -translate-y-0.5 text-white border-transparent bg-gradient-to-br from-purple-600 to-blue-500' 
                : 'bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
        onClick={() => onArm(chord.name)}
    >
        {isActive && <span className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-75 blur-md animate-pulse"></span>}
        <span className={`relative flex items-center justify-center w-5 h-5 text-xs rounded-full mr-2 ${isActive ? 'bg-white text-blue-600' : 'bg-gray-600 dark:bg-gray-500 text-white'}`}>{index + 1}</span>
        <span className="relative">{chord.name}</span>
    </button>
);

const EditorLine = ({ line, onLineClick, onChordClick }) => {
    return (
        <>
            <div className="chord-line relative h-6" data-id={line.id} onClick={(e) => onLineClick(e, line.id)}>
                {line.chords.map(chord => (
                    <span
                        key={chord.id}
                        className="chord-span absolute bg-white/80 dark:bg-black/80 px-1 cursor-pointer rounded text-fuchsia-500 dark:text-fuchsia-400"
                        style={{ left: `${chord.position}px` }}
                        onClick={(e) => onChordClick(e, line.id, chord.id)}
                    >
                        {chord.text}
                    </span>
                ))}
                {'\u00A0'}
            </div>
            <div className="lyric-line w-full outline-none">{line.text || '\u00A0'}</div>
        </>
    );
};

export default function App() {
    const [scaleKey, setScaleKey] = useState('C');
    const [scaleType, setScaleType] = useState('major');
    const [lines, setLines] = useState([]);
    const [lyrics, setLyrics] = useState('');
    const [armedChord, setArmedChord] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [editorStep, setEditorStep] = useState('lyrics');
    const charWidthRef = useRef(0);

    const chords = getScaleChords(scaleKey, scaleType);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
    }, [isDarkMode]);

    useEffect(() => {
        // Precise character width measurement for export accuracy
        const measure = document.createElement('span');
        measure.style.fontFamily = "'Inconsolata', monospace";
        measure.style.fontSize = '1rem'; // Match .chord-output font-size
        measure.style.lineHeight = '1.8'; // Match .chord-output line-height
        measure.style.whiteSpace = 'pre';
        measure.style.visibility = 'hidden';
        measure.style.position = 'absolute';
        const sampleString = 'abcdefghijklmnopqrstuvwxyz0123456789';
        measure.textContent = sampleString; 
        document.body.appendChild(measure);
        charWidthRef.current = measure.getBoundingClientRect().width / sampleString.length;
        document.body.removeChild(measure);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
            const key = e.key;
            if (key >= '1' && key <= '7') {
                e.preventDefault();
                const chordToArm = chords[parseInt(key, 10) - 1];
                if (chordToArm) toggleArmChord(chordToArm.name);
            } else if (key === 'Escape') {
                e.preventDefault();
                if (armedChord) setArmedChord(null);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [armedChord, chords]);

    const showToast = (message) => {
        setToast({ show: true, message });
        setTimeout(() => setToast({ show: false, message: '' }), 2000);
    };

    const toggleArmChord = (chordName) => {
        setArmedChord(prev => (prev === chordName ? null : chordName));
    };

    const handleLineClick = (e, lineId) => {
        if (!armedChord) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const position = e.clientX - rect.left;
        setLines(prevLines => prevLines.map(line => 
            line.id === lineId ? { ...line, chords: [...line.chords, { id: Date.now(), text: armedChord, position }] } : line
        ));
    };

    const handleChordClick = (e, lineId, chordId) => {
        e.stopPropagation();
        setLines(prevLines => prevLines.map(line => 
            line.id === lineId ? { ...line, chords: line.chords.filter(c => c.id !== chordId) } : line
        ));
    };

    const clearEditor = () => {
        setLyrics('');
        setLines([]);
        setArmedChord(null);
        setEditorStep('lyrics');
    };

    const lockLyrics = () => {
        const lyricLines = lyrics.split('\n');
        const newLines = lyricLines.map((text, index) => {
            const existingLine = lines[index];
            return {
                id: existingLine ? existingLine.id : index,
                text,
                chords: existingLine ? existingLine.chords : []
            };
        });
        setLines(newLines);
        setEditorStep('chords');
    };

    const unlockLyrics = () => {
        const currentLyrics = lines.map(line => line.text).join('\n');
        setLyrics(currentLyrics);
        setEditorStep('lyrics');
    };

    const handleTranspose = (amount) => {
        setLines(prevLines => prevLines.map(line => ({
            ...line,
            chords: line.chords.map(c => ({ ...c, text: transposeChord(c.text, amount) }))
        })));
        setScaleKey(prevKey => transposeChord(prevKey, amount));
    };

    const flattenForExport = useCallback(() => {
        let text = '';
        lines.forEach(line => {
            let chordLineText = '';
            const sortedChords = [...line.chords].sort((a, b) => a.position - b.position);
            let lastCharIndex = 0;
            sortedChords.forEach(chord => {
                const charIndex = Math.round(chord.position / charWidthRef.current);
                const spaces = Math.max(0, charIndex - lastCharIndex);
                chordLineText += ' '.repeat(spaces) + chord.text;
                lastCharIndex = charIndex + chord.text.length;
            });
            text += chordLineText + '\n';
            text += line.text + '\n';
        });
        return text;
    }, [lines]);

    const copyToClipboard = () => {
        const textToCopy = flattenForExport();
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!');
        } catch (err) {
            showToast('Failed to copy.');
        }
        document.body.removeChild(textArea);
    };

    const printSheet = () => {
        const printContent = flattenForExport().replace(/\n/g, '<br>');
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<html><head><title>Chord Sheet</title><style>body { font-family: 'Inconsolata', monospace; white-space: pre; font-size: 1rem; line-height: 1.8; }</style></head><body>${printContent}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    };

    return (
        <div className="bg-gray-100 dark:bg-black text-gray-800 dark:text-gray-200 p-4 md:p-8 min-h-screen transition-colors duration-300">
            <Toast message={toast.message} show={toast.show} />
            <div className="max-w-7xl mx-auto">
                <header className="relative text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                    Only
                    <span className="bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text bg-[length:200%_auto] animate-gradient-flow">
                        Chords
                    </span>
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">A modern Chord sheet making tool for musicians & song writers.</p>
                    <div className="absolute top-0 right-0">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl shadow-lg border border-transparent dark:border-gray-800">
                        <h2 className="text-2xl font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">1. Settings & Editor</h2>
                        <div className="controls-section mb-6 p-4 bg-gray-50 dark:bg-black/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold mb-3">Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Root Note</label>
                                    <select value={scaleKey} onChange={e => setScaleKey(e.target.value)} className="w-full p-2 border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm">
                                        {NOTES.map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Scale Type</label>
                                    <select value={scaleType} onChange={e => setScaleType(e.target.value)} className="w-full p-2 border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm">
                                        <option value="major">Major</option>
                                        <option value="minor">Minor</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Transpose Chords</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleTranspose(-1)} className="flex-1 flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-bold py-2 px-4 rounded-lg shadow transition-colors"><ChevronDown size={16} /> Down</button>
                                        <button onClick={() => handleTranspose(1)} className="flex-1 flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-bold py-2 px-4 rounded-lg shadow transition-colors"><ChevronUp size={16} /> Up</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {editorStep === 'chords' && (
                            <div className="sticky top-6 z-10">
                                <div className="relative p-1 rounded-xl shadow-lg bg-gradient-to-r from-purple-600 to-blue-500">
                                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-lg">
                                        <h3 className="text-lg font-semibold pt-3 mb-3 px-4">Chord Palette</h3>
                                        <div className="flex flex-wrap gap-2 p-4 pt-0 min-h-[50px]">
                                            {chords.map((c, i) => <ChordButton key={c.name} chord={c} index={i} onArm={toggleArmChord} isActive={armedChord === c.name} />)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-6">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold">
                                    {editorStep === 'lyrics' ? 'Step 1: Edit Lyrics' : 'Step 2: Place Chords'}
                                </h3>
                                {editorStep === 'lyrics' ? (
                                    <button onClick={lockLyrics} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors"><Music size={16} /> Add Chords</button>
                                ) : (
                                    <button onClick={unlockLyrics} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors"><PenSquare size={16} /> Edit Lyrics</button>
                                )}
                            </div>
                            {editorStep === 'lyrics' ? (
                                <textarea
                                    value={lyrics}
                                    onChange={e => setLyrics(e.target.value)}
                                    placeholder="Start typing or paste your lyrics here..."
                                    className="w-full p-4 rounded-lg font-mono text-base bg-white dark:bg-black transition-all duration-300 border-2 border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:shadow-lg focus:outline-none"
                                    style={{ lineHeight: 1.8 }}
                                    rows={15}
                                />
                            ) : (
                                <div className={`chord-editor bg-white dark:bg-black transition-all duration-300 border-2 border-gray-300 dark:border-gray-700 focus-within:border-blue-500 focus-within:shadow-lg ${armedChord ? 'armed' : ''} font-mono text-base leading-relaxed`}>
                                    {lines.map(line => <EditorLine key={line.id} line={line} onLineClick={handleLineClick} onChordClick={handleChordClick} />)}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900/50 p-6 rounded-xl shadow-lg border border-transparent dark:border-gray-800">
                        <h2 className="text-2xl font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">2. Final Chord Sheet</h2>
                        <div className="action-buttons mb-4 flex flex-wrap gap-3">
                            <button onClick={copyToClipboard} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors"><Copy size={16} /> Copy</button>
                            <button onClick={printSheet} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors"><Printer size={16} /> Print</button>
                            <button onClick={clearEditor} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors"><Trash2 size={16} /> Clear</button>
                        </div>
                        <div className="chord-output bg-gray-50 dark:bg-black/50 rounded-lg p-4 font-mono text-base leading-relaxed">
                           {lines.length > 0 && lines.map(line => <EditorLine key={line.id} line={line} onLineClick={()=>{}} onChordClick={()=>{}} />)}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

