"use client"
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Subtitles } from 'lucide-react';

// Braille Dictionary
const braille_dict = {
  // Letters (lowercase)
  'a': '⠁', 'b': '⠃', 'c': '⠉', 'd': '⠙', 'e': '⠑', 'f': '⠋', 'g': '⠛', 'h': '⠓', 'i': '⠊', 'j': '⠚',
  'k': '⠅', 'l': '⠇', 'm': '⠍', 'n': '⠝', 'o': '⠕', 'p': '⠏', 'q': '⠟', 'r': '⠗', 's': '⠎', 't': '⠞',
  'u': '⠥', 'v': '⠧', 'w': '⠺', 'x': '⠭', 'y': '⠽', 'z': '⠵',

  // Uppercase indicator + letters (simplified for mapping, standard braille uses indicator)
  // For simplicity in this chat app, we map upper directly to the dot patterns if preferred, 
  // or we can stick to strict 6-dot. The user provided specific mapping:
  'A': '⠠⠁', 'B': '⠠⠃', 'C': '⠠⠉', 'D': '⠠⠙', 'E': '⠠⠑', 'F': '⠠⠋', 'G': '⠠⠛', 'H': '⠠⠓', 'I': '⠠⠊', 'J': '⠠⠚',
  'K': '⠠⠅', 'L': '⠠⠇', 'M': '⠠⠍', 'N': '⠠⠝', 'O': '⠠⠕', 'P': '⠠⠏', 'Q': '⠠⠟', 'R': '⠠⠗', 'S': '⠠⠎', 'T': '⠠⠞',
  'U': '⠠⠥', 'V': '⠠⠧', 'W': '⠠⠺', 'X': '⠠⠭', 'Y': '⠠⠽', 'Z': '⠠⠵',

  ' ': '⠀',
  '0': '⠚', '1': '⠁', '2': '⠃', '3': '⠉', '4': '⠙', '5': '⠑', '6': '⠋', '7': '⠛', '8': '⠓', '9': '⠊',
  '#': '⠼',
  ',': '⠂', ';': '⠆', ':': '⠒', '.': '⠲', '!': '⠖', '?': '⠦',
  '\'': '⠄', '"': '⠶', '-': '⠤', '_': '⠸⠤', '/': '⠌', '\\': '⠡',
  '@': '⠈⠁', '&': '⠯', '*': '⠔', '+': '⠖', '=': '⠶',
  '%': '⠨⠴', '~': '⠐⠴', '`': '⠈', '^': '⠘',
  '(': '⠣', ')': '⠜', '[': '⠪', ']': '⠻', '{': '⠸⠣', '}': '⠸⠜',
  '<': '⠣', '>': '⠜', '|': '⠸⠳',
  '$': '⠈⠎', '¢': '⠈⠉', '£': '⠈⠇', '€': '⠈⠑',
  '×': '⠦', '÷': '⠲⠌⠲', '±': '⠖⠤',
  '\n': '⠐⠤', '\t': '⠐⠶'
};

const textToBraille = (text) => {
  return text.split('').map(char => braille_dict[char] || braille_dict[char.toLowerCase()] || char).join('');
};

const VideoMeeting = () => {
  const params = useParams();
  const roomID = params.roomId;
  const { data: session, status } = useSession();
  const router = useRouter();
  const containerRef = useRef(null) // ref for video container element
  const [zp, setZp] = useState(null)
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true); // Default ON for verification
  // transcript state buffers local logic
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [remoteCaption, setRemoteCaption] = useState(""); // For captions

  // WebSocket Reference for Braille Stream
  const wsRef = useRef(null);

  // Throttling for Braille Stream
  const lastStreamTime = useRef(0);
  // const [lastError, setLastError] = useState(""); // Removed
  // const [debugLogs, setDebugLogs] = useState([]); // Removed
  const recognitionRef = useRef(null);
  const captionTimeoutRef = useRef(null);

  // Tabbed Chat State
  const [messages, setMessages] = useState([]);
  // const [activeTab, setActiveTab] = useState('text'); // Removed
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [debugInfo, setDebugInfo] = useState("Waiting for events...");
  const [brailleInput, setBrailleInput] = useState("");
  const joinRoomCalled = useRef(false);
  const sentMsgIds = useRef(new Set());
  // const lastStreamTime = useRef(0); // For throttling - moved above

  // ... (useEffects)

  const handleSendBraille = async () => {
    if (!brailleInput.trim() || !zp) return;

    const brailleText = textToBraille(brailleInput);
    const msgID = Date.now().toString() + Math.random().toString().slice(2, 6);

    const payload = {
      type: 'braille', // New type
      text: brailleText, // Already converted
      name: session?.user?.name || "Guest",
      msgID: msgID
    };

    try {
      // Track ID
      sentMsgIds.current.add(msgID);
      await zp.sendInRoomMessage(JSON.stringify(payload));

      // Local feedback
      setMessages(prev => [...prev.slice(-49), {
        sender: "You",
        text: brailleInput,
        type: 'braille',
        timestamp: Date.now()
      }]);

      setBrailleInput("");
    } catch (e) {
      console.error("Failed to send braille", e);
    }
  };




  useEffect(() => {
    if (status === 'authenticated' && session?.user?.name && containerRef.current) {
      joinMeeting(containerRef.current)
    } else if (status === 'unauthenticated') {
      toast.info("Please login to join the meeting");
      router.push('/user-auth');
    }
  }, [session, status])

  useEffect(() => {
    return () => {
      if (zp) {
        zp.destroy()
      }
    }
  }, [zp])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = async (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const finalTranscript = event.results[i][0].transcript;

            // Clear local preview once sent
            setTranscript("");

            // Broadcast to Zego Chat
            // Broadcast to WebSocket (Replaces Zego)
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              const msgID = Date.now().toString() + Math.random().toString().slice(2, 6);
              const payload = {
                type: 'caption',
                text: finalTranscript,
                name: session?.user?.name || "Guest",
                msgID: msgID
              };

              try {
                wsRef.current.send(JSON.stringify(payload));
                // console.log("Sent caption via WS");
              } catch (e) { console.error(e) }
            }

          } else {
            // Show interim results locally
            interimTranscript += event.results[i][0].transcript;
            setTranscript(interimTranscript);

            // Broadcast Interim to WebSocket (Instant Feedback for Receiver)
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              const diffPayload = {
                type: 'caption',
                text: interimTranscript,
                name: session?.user?.name || "Guest",
                msgID: "stream-cap" // Fixed ID or random? Logic just needs type/sender match
              };
              try { wsRef.current.send(JSON.stringify(diffPayload)); } catch (e) { }
            }
          }
        }
      };

      recognition.onerror = (event) => {
        // setLastError(event.error); // Removed
        if (event.error === 'no-speech') {
          return;
        }
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          setShowCaptions(false);
          setIsListening(false);
          toast.error("Microphone access blocked");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (showCaptions && recognitionRef.current) {
          // Auto-restart with delay
          setTimeout(() => {
            try {
              if (recognitionRef.current && showCaptions) {
                recognitionRef.current.start();
              }
            } catch (e) { }
          }, 300);
        }
      };

      recognitionRef.current = recognition;
    }
  }, [zp, showCaptions]);

  // Toggle effect
  useEffect(() => {
    if (showCaptions && recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) { }
    } else if (!showCaptions && recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [showCaptions, isListening]);

  // Cleanup 
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, []);

  // --- WebSocket Initialization ---
  useEffect(() => {
    // Connect to local WebSocket server for ultra-low latency streams
    wsRef.current = new WebSocket('ws://localhost:8080');

    wsRef.current.onopen = () => {
      console.log('Connected to Braille WebSocket Server');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'braille_stream') {
          const { text, name } = data;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.sender === name && last.type === 'braille') {
              const updated = [...prev];
              updated[updated.length - 1] = { ...last, text: text, timestamp: Date.now() };
              return updated;
            }
            return [...prev.slice(-49), { sender: name, text: text, type: 'braille', timestamp: Date.now() }];
          });
        }
        else if (data.type === 'caption') {
          const { text, name } = data;
          setRemoteCaption(`${name}: ${text}`);

          // SMART UPDATE: Update last bubble if it's a caption from same user
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.sender === name && last.type === 'caption') {
              const updated = [...prev];
              updated[updated.length - 1] = { ...last, text: text, timestamp: Date.now() };
              return updated;
            }
            return [...prev.slice(-49), { sender: name, text: text, type: 'caption', timestamp: Date.now() }];
          });

          // Auto-clear caption after 10s
          if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
          captionTimeoutRef.current = setTimeout(() => setRemoteCaption(""), 10000);
        }
      } catch (err) {
        console.error("WS Parse Error", err);
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);


  const joinMeeting = async (element) => {
    // Prevent double-join in Strict Mode
    if (joinRoomCalled.current) return;
    joinRoomCalled.current = true;

    const appID = Number(process.env.NEXT_PUBLIC_ZEGOAPP_ID);
    const serverSecret = process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET;

    if (!appID || !serverSecret) {
      toast.error('Please configure ZegoCloud AppID and Secret');
      return;
    }

    // Dynamic import to avoid SSR issues
    const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt');
    const { ZIM } = await import('zego-zim-web');

    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomID, session?.user?.id || Date.now().toString(), session?.user?.name || 'Guest');

    const zegoInstance = ZegoUIKitPrebuilt.create(kitToken);

    // Add ZIM plugin for In-Room Messaging/Commands
    if (ZIM) {
      zegoInstance.addPlugins({ ZIM });
    }

    setZp(zegoInstance)

    zegoInstance.joinRoom({
      container: element,
      sharedLinks: [
        {
          name: 'join via this link',
          url: `${window.location.origin}/video-meeting/${roomID}`
        },
      ],
      scenario: {
        mode: ZegoUIKitPrebuilt.GroupCall,
        config: {
          role: "Host",
        }
      },
      turnOnMicrophoneWhenJoining: true,
      turnOnCameraWhenJoining: true,
      showMyCameraToggleButton: true,
      showMyMicrophoneToggleButton: true,
      showAudioVideoSettingsButton: true,
      showScreenSharingButton: true,
      showTextChat: true,
      showUserList: true,
      maxUsers: 50,
      layout: "Auto",
      showLayoutButton: true,
      showTurnOffRemoteCameraButton: true,
      showTurnOffRemoteMicrophoneButton: true,
      showRemoveUserButton: true,
      onJoinRoom: () => {
        toast.success('Meeting joined succesfully')
        setIsInMeeting(true);
      },
      onLeaveRoom: () => {
        endMeeting();
      },
      onInRoomCustomCommandReceived: (command) => {
        // Standardize input to an Array of message objects
        let cmds = [];
        if (Array.isArray(command)) cmds = command;
        else if (typeof command === 'object') cmds = [command];
        else cmds = [{ message: command }]; // Fallback

        // Process each command
        cmds.forEach(cmdItem => {
          let payloadStr = cmdItem.message || cmdItem.command || "";
          if (!payloadStr && typeof cmdItem === 'string') payloadStr = cmdItem;

          // DEBUG: Verify CustomCommand arrival
          toast.info("CMD: " + payloadStr.slice(0, 20));

          // --- EMERGENCY DEBUG ---
          // console.log("Incoming RAW:", JSON.stringify(cmdItem)); 

          // 1. HARD NAME BLOCK (Aggressive)
          // If the sender name matches local user, BLOCK IT INSTANTLY.
          const incomingName = cmdItem.fromUser?.userName;
          const myName = session?.user?.name;

          // Check outer envelope name
          if (incomingName && myName && incomingName.toLowerCase() === myName.toLowerCase()) {
            return; // Block by Envelope Name
          }
          // -----------------------

          let data = null;
          try {
            if (typeof payloadStr === 'string' && (payloadStr.startsWith('{') || payloadStr.startsWith('['))) {
              data = JSON.parse(payloadStr);
            }
          } catch (e) { }

          // 2. ID DEDUPLICATION (Backup)
          if (data && data.msgID && sentMsgIds.current.has(data.msgID)) {
            return; // Block by ID
          }

          // 3. Fallback Filter by Inner JSON Name
          if (data && data.name === myName) {
            return; // Block by Inner Name
          }

          // 4. Process Valid Remote Caption
          if (data && data.type === 'caption') {
            const { text, name } = data;
            setRemoteCaption(`${name}: ${text}`);
            setMessages(prev => [...prev.slice(-49), { sender: name, text: text, type: 'caption', timestamp: Date.now() }]);

            if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
            captionTimeoutRef.current = setTimeout(() => setRemoteCaption(""), 10000);
          }
          // 5. Handle "Braille Stream" (Live Typing) for CustomCommand
          else if (data && data.type === 'braille_stream') {
            console.log("[BrailleDebug] Received CustomCommand Stream:", data);
            const { text, name } = data;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              // If last message is from same sender and is a braille stream -> UPDATE IT
              if (last && last.sender === name && last.type === 'braille') {
                // Create new copy of array with updated last element
                const updated = [...prev];
                updated[updated.length - 1] = { ...last, text: text, timestamp: Date.now() };
                return updated;
              }
              // Else -> New Bubble
              return [...prev.slice(-49), { sender: name, text: text, type: 'braille', timestamp: Date.now() }];
            });
          }
          // 6. Handle "Simple String" Legacy
          else if (typeof payloadStr === 'string' && payloadStr.startsWith("[Speech]:")) {
            const cleanText = payloadStr.replace("[Speech]:", "").trim();
            const sender = cmdItem.fromUser?.userName || "Remote";

            // Double check envelope again just in case
            if (sender === myName) return;

            setRemoteCaption(`${sender}: ${cleanText}`);
            setMessages(prev => [...prev.slice(-49), { sender: sender, text: cleanText, type: 'caption', timestamp: Date.now() }]);
          }
        });
      },
      onInRoomMessageReceived: (messageInfo) => {
        // Standardize Array
        let msgs = [];
        if (Array.isArray(messageInfo)) msgs = messageInfo;
        else if (typeof messageInfo === 'object') msgs = [messageInfo];

        msgs.forEach(msg => {
          const content = msg.message || msg.content || msg.textContent || "";

          // HArd Name Block (Standard)
          const sender = msg.fromUser?.userName;
          const senderID = msg.fromUser?.userID;
          const myName = session?.user?.name;
          const myID = session?.user?.id;

          if (sender && myName && sender.toLowerCase() === myName.toLowerCase()) return;
          if (senderID && myID && senderID === myID) return;

          if (content) {
            // Check if JSON in content? (InRoomMessage might be raw string or JSON)
            let data = null;
            try { data = JSON.parse(content); } catch (e) { }

            // ID Block
            if (data && data.msgID && sentMsgIds.current.has(data.msgID)) return;
            if (data && data.name === myName) return;


            if (content.startsWith("[Speech]:")) {
              // ...
            }
            if (data && data.type === 'braille') {
              const { text, name } = data;
              setMessages(prev => [...prev.slice(-49), { sender: name, text: text, type: 'braille', timestamp: Date.now() }]);
            }
            else if (data && data.type === 'braille_stream') {
              const { text, name, msgID } = data;

              setMessages(prev => {
                const last = prev[prev.length - 1];
                // If last message is from same sender and is a braille stream -> UPDATE IT
                if (last && last.sender === name && last.type === 'braille') {
                  // Create new copy of array with updated last element
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...last, text: text, timestamp: Date.now() };
                  return updated;
                }
                // Else -> New Bubble
                return [...prev.slice(-49), { sender: name, text: text, type: 'braille', timestamp: Date.now() }];
              });
            }
            else {
              if (!data && content.startsWith("[Speech]:")) {
                setRemoteCaption(`${sender || "Unknown"}: ${content.replace("[Speech]:", "").trim()}`);
              }

              // Standard Chat or Legacy Caption -> Add to Braille Panel
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.text === content && (Date.now() - last.timestamp < 1000)) return prev;
                return [...prev.slice(-49), { sender: sender || "Unknown", text: content, type: 'chat', timestamp: Date.now() }];
              });
            }
          }
        });
      },
      onInRoomTextMessageReceived: (messageInfo) => {
        let msgs = [];
        if (Array.isArray(messageInfo)) msgs = messageInfo;
        else if (typeof messageInfo === 'object') msgs = [messageInfo];

        msgs.forEach(msg => {
          const content = msg.message || msg.content || msg.textContent || "";

          // HArd Name Block (Standard)
          const sender = msg.fromUser?.userName;
          const senderID = msg.fromUser?.userID;
          const myName = session?.user?.name;
          const myID = session?.user?.id;

          if (sender && myName && sender.toLowerCase() === myName.toLowerCase()) return;
          if (senderID && myID && senderID === myID) return;

          if (content) {
            let data = null;
            try { data = JSON.parse(content); } catch (e) { }

            if (data) {
              console.log("RX Chat JSON:", data);
              toast.info("RX Chat JSON: " + JSON.stringify(data).slice(0, 50));
            }

            // 1. Handle Braille Types
            if (data && (data.type === 'braille' || data.type === 'braille_stream')) {
              if (data.type === 'braille_stream') {
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  // If last message is from same sender and is a braille stream -> UPDATE IT
                  if (last && last.sender === data.name && last.type === 'braille') {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...last, text: data.text, timestamp: Date.now() };
                    return updated;
                  }
                  // Else -> New Bubble
                  return [...prev.slice(-49), { sender: data.name, text: data.text, type: 'braille', timestamp: Date.now() }];
                });
              } else {
                // Standard Braille Message
                setMessages(prev => [...prev.slice(-49), { sender: data.name, text: data.text, type: 'braille', timestamp: Date.now() }]);
              }
              console.log("Processed Braille Update for:", data.name);
              return; // Stop processing (don't show as raw text)
            }

            // 2. Legacy/Standard Chat
            if (content.startsWith("[Speech]:")) {
              setRemoteCaption(`${sender}: ${content.replace("[Speech]:", "").trim()}`);
            }
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.text === content && (Date.now() - last.timestamp < 1000)) return prev;
              return [...prev.slice(-49), { sender: sender, text: content, type: 'chat', timestamp: Date.now() }];
            });
          }
        });
      },
    });
  };

  const handleBrailleChange = async (text) => {
    setBrailleInput(text);
    if (!zp) return;

    const brailleText = textToBraille(text);
    // CRITICAL FIX: Unique ID per keystroke to bypass "Seen Message" filters
    const msgID = Date.now().toString() + Math.random().toString().slice(2, 6);

    const payload = {
      type: 'braille_stream',
      text: brailleText,
      name: session?.user?.name || "Guest",
      msgID: msgID
    };

    const now = Date.now();
    // Use smaller throttle for WebSocket (e.g. 50ms is fine for local/fast socket)
    if (now - lastStreamTime.current < 50) {
      return;
    }
    lastStreamTime.current = now;

    try {
      // Send via WebSocket if open
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }

      // Update Local "You" Bubble
      setMessages(prev => {
        const last = prev[prev.length - 1];
        // If last message is ME and is Braille -> Update
        if (last && last.sender === "You" && last.type === 'braille') {
          const updated = [...prev];
          updated[updated.length - 1] = { ...last, text: text, timestamp: Date.now() };
          return updated;
        }
        // Else -> New Bubble
        return [...prev.slice(-49), { sender: "You", text: text, type: 'braille', timestamp: Date.now() }];
      });

    } catch (e) {
      console.error("Braille Stream Send Error:", e);
    }
  };

  const endMeeting = () => {
    // Cleanup handled by useEffect when zp changes or unmounts
    // if (zp) zp.destroy(); 

    toast.success('Meeting end succesfully');
    setZp(null);
    setIsInMeeting(false);
    setShowCaptions(false);
    router.push('/');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <div
        className={`flex-grow flex flex-col md:flex-row relative ${isInMeeting ? "h-screen" : ""
          }`}
      >
        <div
          ref={containerRef}
          className="video-container flex-grow"
          style={{ height: isInMeeting ? "100%" : "calc(100vh - 4rem)" }}
        ></div>

        {/* Docked Braille Sidebar */}
        {isInMeeting && isChatOpen && (
          <div className="w-80 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0 z-10 transition-all duration-300">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center shadow-sm">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <span className="text-yellow-500 text-lg">⠃⠗⠇</span> Braille Chat
              </h3>
              {/* Close Button helpful for mobile */}
              <button onClick={() => setIsChatOpen(false)} className="md:hidden text-gray-500 hover:text-red-500">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-black/20">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-20 flex flex-col items-center gap-2">
                  <div className="text-4xl opacity-20">⠼⠀⠓</div>
                  <div className="text-sm">Waiting for speech or messages...</div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 flex justify-between">
                    {msg.sender}
                    <span className="font-normal opacity-50 text-[10px]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-bold text-lg tracking-wider shadow-sm break-words leading-relaxed">
                    {textToBraille(msg.text)}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex flex-col gap-2">
                <div className="text-xs text-gray-400">Type to send Braille:</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={brailleInput}
                    onChange={(e) => handleBrailleChange(e.target.value)}
                    className="flex-1 p-2 rounded border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-black/20 text-black dark:text-white"
                    placeholder="Type to stream..."
                  />
                  <button
                    onClick={handleSendBraille}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 rounded font-bold"
                  >
                    ⠋
                  </button>
                </div>
                {/* Live Preview */}
                {brailleInput && (
                  <div className="text-right text-yellow-600 dark:text-yellow-400 text-lg tracking-wider overflow-hidden text-ellipsis whitespace-nowrap">
                    {textToBraille(brailleInput)}
                  </div>
                )}
              </div>
            </div>

            <div className="p-2 text-center text-[10px] text-gray-400 border-t border-gray-200 dark:border-gray-800">
              Live Braille Transcription Active
            </div>
          </div>
        )}

        {/* Caption Overlay */}
        {isInMeeting && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-6 py-3 rounded-lg text-lg max-w-3xl text-center z-50 pointer-events-none transition-opacity duration-300 flex flex-col gap-2">



            {transcript && (
              <div className="text-gray-300 text-lg italic animate-pulse">
                {transcript}
              </div>
            )}

            {remoteCaption && (
              <div className="flex flex-col items-center gap-1">
                <div className="font-medium text-xl">{remoteCaption}</div>
                <div className="text-yellow-400 text-2xl tracking-wider">{textToBraille(remoteCaption)}</div>
              </div>
            )}
          </div>
        )}

        {/* Caption Toggle Button */}
        {isInMeeting && (
          <div className="absolute top-4 left-4 z-50 flex gap-2">
            <button
              onClick={() => setShowCaptions(!showCaptions)}
              className={`p-3 rounded-full ${showCaptions ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white/70 hover:text-white'} transition-colors shadow-lg`}
              title="Toggle Captions"
            >
              <Subtitles className="w-6 h-6" />
              {isListening && <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
            </button>

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-3 rounded-full ${isChatOpen ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white/70 hover:text-white'} transition-colors shadow-lg`}
              title="Toggle Chat Panel"
            >
              {/* Chat Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z" /><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" /></svg>
            </button>
          </div>
        )}

      </div>
      {!isInMeeting && (
        <div className="flex flex-col">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
              Meeting Info
            </h2>
            <p className="mb-4 text-gray-600 dark:text-gray-300">
              Participant - {session?.user?.name || "You"}
            </p>
            <Button
              onClick={endMeeting}
              className="w-full bg-red-500 hover:bg-red-200 text-white hover:text-black"
            >
              End Meeting
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-200 dark:bg-gray-700">
            <div className="text-center">
              <Image
                src="/images/videoQuality.jpg"
                alt="Feature 1"
                width={150}
                height={150}
                className="mx-auto mb-2 rounded-full"
              />
              <h3 className="text-lg font-semibold mb-1 text-gray-800 dark:text-white">
                HD Video Quality
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                Experience crystal clear video calls
              </p>
            </div>
            <div className="text-center">
              <Image
                src="/images/screenShare.jpg"
                alt="Feature 1"
                width={150}
                height={150}
                className="mx-auto mb-2 rounded-full"
              />
              <h3 className="text-lg font-semibold mb-1 text-gray-800 dark:text-white">
                Screen Sharing
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                Easily  share your screen with participant
              </p>
            </div>
            <div className="text-center">
              <Image
                src="/images/videoSecure.jpg"
                alt="Feature 1"
                width={150}
                height={150}
                className="mx-auto mb-2 rounded-full"
              />
              <h3 className="text-lg font-semibold mb-1 text-gray-800 dark:text-white">
                Secure Meetings
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                Your meetings are protected and private
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoMeeting