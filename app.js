import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js';
import { getDatabase, ref, onValue, push, set, off } from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import MemeCreationStudio from './MemeCreationStudio.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBv1mD2brzhfDxgZyjUis6j0XmhsQcPwMI",
  authDomain: "hackathons-project-83560.firebaseapp.com",
  databaseURL: "https://hackathons-project-83560-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hackathons-project-83560",
  storageBucket: "hackathons-project-83560.firebasestorage.app",
  messagingSenderId: "693799285364",
  appId: "1:693799285364:web:3c5b3ea19bf53bd4ce9721",
  measurementId: "G-KJ3HEQ2DWR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

function NavBar({ user, onLogin, onLogout }) {
  return (
    <nav style={{ backgroundColor: '#333', padding: '10px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <Link to="/" style={{ color: 'white', marginRight: '15px', textDecoration: 'none' }}>Home</Link>
        <Link to="/create" style={{ color: 'white', textDecoration: 'none' }}>Meme Creation Studio</Link>
      </div>
      <div>
        {user ? (
          <>
            <span style={{ marginRight: '15px' }}>Hello, {user.displayName || user.email}</span>
            <button onClick={onLogout} style={{ cursor: 'pointer' }}>Log Out</button>
          </>
        ) : (
          <button onClick={onLogin} style={{ cursor: 'pointer' }}>Log In with Google</button>
        )}
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer style={{ backgroundColor: '#333', padding: '10px', color: 'white', marginTop: '20px', textAlign: 'center' }}>
      <p>&copy; 2024 MemeHub. All rights reserved.</p>
    </footer>
  );
}

function Home({ user }) {
  const [message, setMessage] = useState('Loading MemeHub...');
  const [memes, setMemes] = useState([]);
  const [newMeme, setNewMeme] = useState('');
  const [userVotes, setUserVotes] = useState({}); // memeId: { userId: voteValue }
  const [comments, setComments] = useState({}); // memeId: { commentId: {text} }
  const [commentInputs, setCommentInputs] = useState({}); // memeId: current input text
  const [flags, setFlags] = useState({}); // memeId: boolean

  useEffect(() => {
    setMessage('Welcome to MemeHub');

    const memesRef = ref(database, 'memes');
    const votesRef = ref(database, 'votes');
    const commentsRef = ref(database, 'comments');
    const flagsRef = ref(database, 'flags');

    const memesListener = onValue(memesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const memesList = Object.entries(data).map(([key, value]) => ({ id: key, ...value }));
        setMemes(memesList);
      } else {
        setMemes([]);
      }
    }, (error) => {
      console.error('Error fetching memes:', error);
      setMessage('Error loading memes');
    });

    const votesListener = onValue(votesRef, (snapshot) => {
      const data = snapshot.val() || {};
      setUserVotes(data);
    });

    const commentsListener = onValue(commentsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setComments(data);
    });

    const flagsListener = onValue(flagsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setFlags(data);
    });

    return () => {
      off(memesRef, 'value', memesListener);
      off(votesRef, 'value', votesListener);
      off(commentsRef, 'value', commentsListener);
      off(flagsRef, 'value', flagsListener);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMeme.trim() === '') return;

    const memesRef = ref(database, 'memes');
    const newMemeRef = push(memesRef);
    set(newMemeRef, { text: newMeme.trim(), tags: [] });

    setNewMeme('');
  };

  const handleVote = (memeId, voteValue) => {
    if (!user) {
      alert('Please log in to vote.');
      return;
    }
    const userId = user.uid;
    const voteRef = ref(database, `votes/${memeId}/${userId}`);
    set(voteRef, voteValue);
  };

  const getVoteCount = (memeId) => {
    const memeVotes = userVotes[memeId] || {};
    return Object.values(memeVotes).reduce((acc, val) => acc + val, 0);
  };

  const handleCommentChange = (memeId, text) => {
    setCommentInputs((prev) => ({ ...prev, [memeId]: text }));
  };

  const handleCommentSubmit = (memeId, e) => {
    e.preventDefault();
    const text = commentInputs[memeId];
    if (!text || text.trim() === '' || text.length > 140) return;
    if (!user) {
      alert('Please log in to comment.');
      return;
    }
    const commentRef = ref(database, `comments/${memeId}`);
    const newCommentRef = push(commentRef);
    set(newCommentRef, { text: text.trim(), userId: user.uid, userName: user.displayName || user.email });

    setCommentInputs((prev) => ({ ...prev, [memeId]: '' }));
  };

  const handleFlag = (memeId) => {
    if (!user) {
      alert('Please log in to flag content.');
      return;
    }
    const flagRef = ref(database, `flags/${memeId}`);
    set(flagRef, true);
  };

  return (
    <div>
      <h1>{message}</h1>
      <p>This is the initial setup of MemeHub with Firebase Realtime Database.</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter a new meme"
          value={newMeme}
          onChange={(e) => setNewMeme(e.target.value)}
        />
        <button type="submit">Add Meme</button>
      </form>

      <ul>
        {memes.map((meme) => (
          <li key={meme.id} style={{ marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
            <p>{meme.text}</p>
            <p>Tags: {(meme.tags || []).join(', ')}</p>
            <div>
              <button onClick={() => handleVote(meme.id, 1)} disabled={userVotes[meme.id]?.[user?.uid] === 1}>Upvote</button>
              <button onClick={() => handleVote(meme.id, -1)} disabled={userVotes[meme.id]?.[user?.uid] === -1}>Downvote</button>
              <span>Votes: {getVoteCount(meme.id)}</span>
            </div>
            <div>
              <button onClick={() => handleFlag(meme.id)} disabled={flags[meme.id]}>Flag/Report</button>
              {flags[meme.id] && <span style={{ color: 'red' }}>Flagged for review</span>}
            </div>
            <div>
              <form onSubmit={(e) => handleCommentSubmit(meme.id, e)}>
                <input
                  type="text"
                  maxLength={140}
                  placeholder="Add a comment (max 140 chars)"
                  value={commentInputs[meme.id] || ''}
                  onChange={(e) => handleCommentChange(meme.id, e.target.value)}
                />
                <button type="submit">Comment</button>
              </form>
              <ul>
                {(comments[meme.id] ? Object.entries(comments[meme.id]) : []).map(([commentId, comment]) => (
                  <li key={commentId}>
                    {comment.text} {comment.userName ? <em>by {comment.userName}</em> : null}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    signInWithPopup(auth, provider).catch((error) => {
      alert('Login failed: ' + error.message);
    });
  };

  const handleLogout = () => {
    signOut(auth).catch((error) => {
      alert('Logout failed: ' + error.message);
    });
  };

  return (
    <Router>
      <NavBar user={user} onLogin={handleLogin} onLogout={handleLogout} />
      <Switch>
        <Route exact path="/" render={() => <Home user={user} />} />
        <Route path="/create" component={MemeCreationStudio} />
      </Switch>
      <Footer />
    </Router>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
