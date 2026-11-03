// Import React hooks
import { useEffect, useRef } from 'react';
// Import the Asciinema player (it plays terminal recordings)
import * as AsciinemaPlayer from 'asciinema-player';
import 'asciinema-player/dist/bundle/asciinema-player.css';



// `latest` comes from the Dashboard (data.latestPlaylog from /api/index):
// { session_id, duration_s, event_count, created_at } or null
export default function PlaylogWidget({ latest }) {
  // Keep a link to the box where the player will be shown
  const playerBox = useRef(null);
  // Get the session id (it is undefined if there is no session)
  const sessionId = latest?.session_id;

  // The player is created only when the session_id changes,
  // so the refreshes of /api/index do not stop it.
  useEffect(() => {
    // Stop if there is no session or the box is not ready
    if (!sessionId || !playerBox.current) return;

    // Create the player and load the recording of this session
    const player = AsciinemaPlayer.create(
      `/api/sessions/${sessionId}/cast`,
      playerBox.current,
      {
        // Make the player fit the width and the height of the box
        fit: 'both',
        // Use a small font in the terminal
        terminalFontSize: 'small',
        // Skip long pauses (more than 2 seconds)
        idleTimeLimit: 2,
        // Color theme of the terminal
        theme: 'monokai',
        // Start playing right away
        autoPlay: true,
        // Play again from the start when it ends
        loop: true,
        // Load the recording before it starts
        preload: true,
      }
    );
    // Remove the player when the session changes or the component closes
    return () => player.dispose();
  }, [sessionId]);

  return (
    <div className="graphChart"
         style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <h3 style={{ margin: '0 0 8px' }}>Latest attacker session</h3>

      {/* Show the player if there is a session, or a message if not */}
      {latest ? (
        <>
          {/* The player is placed inside this box */}
          <div ref={playerBox}
               style={{ flex: 1, minHeight: 220, width: '100%' , borderRadius: 20, overflow: 'hidden'}} />
        </>
      ) : (
        <p style={{ opacity: 0.7 }}>
          No session recorded yet. It appears when an attacker session ends.
        </p>
      )}
    </div>
  );
}