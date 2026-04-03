import * as React from 'react';
import { useState, useEffect, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  User,
  Gamepad2, 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Search, 
  Bell, 
  ChevronRight,
  Shield,
  Zap,
  Trophy,
  Sword,
  Target,
  Car,
  Activity as ActivityIcon,
  CreditCard,
  X,
  Check,
  Signal,
  Globe,
  HardDrive,
  ArrowLeft,
  Loader2,
  Lock,
  Crown,
  Smartphone,
  Wallet,
  Fingerprint,
  FileText,
  Phone,
  Mail,
  Key,
  Edit3,
  Save,
  CreditCard as CardIcon,
  Sun,
  Moon,
  Flag,
  MicOff,
  Camera,
  Upload,
  Twitter,
  Twitch,
  Hash,
  UserPlus,
  UserMinus,
  UserCheck,
  Clock,
  AlertTriangle,
  VolumeX,
  Ban,
  Reply,
  Copy,
  Star,
  MapPin,
  WifiOff,
  ShieldAlert
} from 'lucide-react';

import { GoogleGenAI } from "@google/genai";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
  Timestamp,
  handleFirestoreError, 
  OperationType,
  FirebaseUser,
  increment
} from './firebase';

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if ((this as any).state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsedError = JSON.parse((this as any).state.error.message);
        errorMessage = `Firestore Error: ${parsedError.error} during ${parsedError.operationType} on ${parsedError.path}`;
      } catch (e) {
        errorMessage = (this as any).state.error?.message || String((this as any).state.error);
      }

      return (
        <div className="min-h-screen bg-nexus-dark flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-8 border-nexus-accent/30 max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-nexus-accent/10 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle size={32} className="text-nexus-accent" />
            </div>
            <h2 className="text-xl font-display font-black text-nexus-text uppercase tracking-tighter">System Error</h2>
            <p className="text-nexus-dim text-sm leading-relaxed">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-nexus-accent text-nexus-dark font-display font-black rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition-all"
            >
              Reload Nexus
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// --- Types ---
type UserRole = 'admin' | 'moderator' | 'member' | 'gold';
type View = 'dashboard' | 'games' | 'servers' | 'chat' | 'settings' | 'admin' | 'friends';

interface Message {
  user: string;
  msg: string;
  time: string;
  avatar?: string;
  isMod?: boolean;
  isAI?: boolean;
  isMentioned?: boolean;
  timestamp?: Timestamp;
}

interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  bio?: string;
}

interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: 'achievement' | 'game' | 'social' | 'system';
  text: string;
  createdAt: Timestamp;
}

interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  targetId: string;
  targetName: string;
  action: 'ban' | 'mute' | 'unban' | 'unmute' | 'role_change';
  details: string;
  createdAt: Timestamp;
}

interface PrivateMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: Timestamp;
}

interface Notification {
  id: string;
  type: 'friend_request' | 'direct_message' | 'announcement';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  sender?: {
    name: string;
    avatar: string;
  };
}

interface Server {
  id: string;
  name: string;
  type: string;
  category?: string;
  players: number;
  maxPlayers: number;
  ping: number;
  status: 'online' | 'maintenance' | 'offline';
  region: string;
}

const RoleBadge = ({ role }: { role: UserRole }) => {
  if (role === 'gold') {
    return (
      <span className="nexus-gold-badge">
        GOLD
      </span>
    );
  }
  const config = {
    admin: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'ADMIN' },
    moderator: { color: 'bg-nexus-accent/20 text-nexus-accent border-nexus-accent/30', label: 'MODERATOR' },
    member: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'MEMBER' },
    gold: { color: '', label: '' } // Handled above
  };
  const { color, label } = config[role];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[8px] font-display font-black border ${color} tracking-widest highlight-text`}>
      {label}
    </span>
  );
};

const Tooltip = ({ children, content, position = 'top' }: { children: React.ReactNode, content: string, position?: 'top' | 'bottom' | 'left' | 'right', key?: React.Key }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-nexus-accent/30',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-nexus-accent/30',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-nexus-accent/30',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-nexus-accent/30'
  };

  return (
    <div className="relative inline-flex" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : position === 'bottom' ? -5 : 0, x: position === 'left' ? 5 : position === 'right' ? -5 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : position === 'bottom' ? -5 : 0, x: position === 'left' ? 5 : position === 'right' ? -5 : 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute ${positionClasses[position]} px-3 py-1.5 bg-nexus-dark/95 border border-nexus-accent/30 rounded-lg shadow-2xl z-[1000] whitespace-nowrap pointer-events-none backdrop-blur-md`}
          >
            <p className="text-[9px] font-black text-nexus-text uppercase tracking-widest leading-none">{content}</p>
            <div className={`absolute border-4 border-transparent ${arrowClasses[position]}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminPanel = ({ currentUser, userData, logAdminAction }: { currentUser: any, userData: any, logAdminAction: any }) => {
  const [activeTab, setActiveTab] = useState<'health' | 'users' | 'logs'>('health');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const handleUserAction = async (targetUser: any, action: 'ban' | 'mute' | 'role_change', details: string) => {
    if (!currentUser) return;
    
    try {
      if (action === 'role_change') {
        await updateDoc(doc(db, 'users', targetUser.id), { role: details });
      } else if (action === 'ban') {
        // In a real app, you'd have a 'banned' field or a separate collection
        await updateDoc(doc(db, 'users', targetUser.id), { isBanned: true });
      } else if (action === 'mute') {
        await updateDoc(doc(db, 'users', targetUser.id), { isMuted: true });
      }
      
      await logAdminAction(targetUser.id, targetUser.name, action, details);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${targetUser.id}`);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      setLoadingUsers(true);
      const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'), limit(100));
      const unsub = onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllUsers(users);
        setLoadingUsers(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
        setLoadingUsers(false);
      });
      return () => unsub();
    }
    if (activeTab === 'logs') {
      setLoadingLogs(true);
      const q = query(collection(db, 'admin_logs'), orderBy('createdAt', 'desc'), limit(50));
      const unsub = onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminLog));
        setAdminLogs(logs);
        setLoadingLogs(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'admin_logs');
        setLoadingLogs(false);
      });
      return () => unsub();
    }
  }, [activeTab]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-display font-black tracking-tighter text-nexus-text uppercase">ADMIN CONTROL</h2>
          <div className="flex flex-wrap gap-4 mt-4">
            <Tooltip content="Monitor system performance and service status" position="top">
              <button 
                onClick={() => setActiveTab('health')}
                className={`px-4 py-2 rounded-xl text-[10px] font-display font-black tracking-widest uppercase transition-all ${activeTab === 'health' ? 'bg-nexus-accent text-nexus-dark shadow-lg shadow-nexus-accent/20' : 'bg-white/5 text-nexus-muted hover:bg-white/10'}`}
              >
                System Health
              </button>
            </Tooltip>
            <Tooltip content="Manage user accounts, roles, and permissions" position="top">
              <button 
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-xl text-[10px] font-display font-black tracking-widest uppercase transition-all ${activeTab === 'users' ? 'bg-nexus-accent text-nexus-dark shadow-lg shadow-nexus-accent/20' : 'bg-white/5 text-nexus-muted hover:bg-white/10'}`}
              >
                User Management
              </button>
            </Tooltip>
            <Tooltip content="Review administrative actions and system events" position="top">
              <button 
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-2 rounded-xl text-[10px] font-display font-black tracking-widest uppercase transition-all ${activeTab === 'logs' ? 'bg-nexus-accent text-nexus-dark shadow-lg shadow-nexus-accent/20' : 'bg-white/5 text-nexus-muted hover:bg-white/10'}`}
              >
                Audit Logs
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="flex gap-2">
          <Tooltip content="Immediately restrict all non-admin access to the platform" position="left">
            <button className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[10px] font-black tracking-widest hover:bg-red-500 hover:text-white transition-all">
              EMERGENCY LOCKDOWN
            </button>
          </Tooltip>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'health' ? (
          <motion.div 
            key="health"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-panel rounded-3xl p-8 border-nexus-border">
                <h3 className="text-xl font-black tracking-tight text-nexus-text mb-6 uppercase">System Health</h3>
                <div className="space-y-6">
                  {[
                    { label: 'Main Database', status: 'Optimal', load: '12%', color: 'text-green-400' },
                    { label: 'Auth Service', status: 'Optimal', load: '4%', color: 'text-green-400' },
                    { label: 'Game Servers', status: 'High Load', load: '84%', color: 'text-nexus-accent' },
                    { label: 'AI Engine', status: 'Optimal', load: '22%', color: 'text-green-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-nexus-border">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${item.color === 'text-green-400' ? 'bg-green-400' : 'bg-nexus-accent'} animate-pulse`} />
                        <span className="font-bold text-nexus-text text-sm">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-8">
                        <span className={`text-xs font-display font-black uppercase tracking-widest ${item.color}`}>{item.status}</span>
                        <span className="text-xs font-mono text-nexus-dim">{item.load}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel rounded-3xl p-8 border-nexus-border">
                <h3 className="text-xl font-black tracking-tight text-nexus-text mb-6 uppercase">Real-time Admin Logs</h3>
                <div className="space-y-4">
                  {adminLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-3 border-b border-nexus-border last:border-0">
                      <p className="text-sm text-nexus-muted">
                        <span className="text-nexus-accent font-bold">{log.adminName}</span> 
                        <span className="mx-1 text-nexus-dim uppercase text-[10px] font-display font-black tracking-widest">{log.action}</span>
                        <span className="text-nexus-text font-bold">{log.targetName}</span>
                      </p>
                      <span className="text-[10px] text-nexus-dim uppercase font-bold">
                        {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleTimeString() : 'Just now'}
                      </span>
                    </div>
                  ))}
                  {adminLogs.length === 0 && (
                    <p className="text-center text-nexus-dim text-xs py-4 uppercase tracking-widest font-black">No recent actions recorded</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-panel rounded-3xl p-8 border-nexus-border">
                <h3 className="text-xl font-black tracking-tight text-nexus-text mb-6 uppercase">User Reports</h3>
                <div className="space-y-4">
                  {[
                    { user: 'Gamer99', reason: 'Harassment', status: 'Pending' },
                    { user: 'Speedy', reason: 'Cheating', status: 'Investigating' },
                    { user: 'NoobMaster', reason: 'Spam', status: 'Pending' },
                  ].map((item, i) => (
                    <div key={i} className="p-4 bg-white/5 rounded-2xl border border-nexus-border">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-nexus-text text-sm">{item.user}</span>
                        <span className="text-[8px] font-display font-black bg-nexus-accent/10 text-nexus-accent px-2 py-0.5 rounded border border-nexus-accent/20 uppercase">{item.status}</span>
                      </div>
                      <p className="text-xs text-nexus-dim uppercase tracking-widest font-bold">{item.reason}</p>
                      <div className="flex gap-2 mt-4">
                        <Tooltip content="Examine the details of this user report" position="top">
                          <button className="flex-1 py-2 bg-nexus-accent text-nexus-dark text-[10px] font-display font-black rounded-lg uppercase shadow-lg shadow-nexus-accent/20">Review</button>
                        </Tooltip>
                        <Tooltip content="Ignore this report and clear it from the queue" position="top">
                          <button className="flex-1 py-2 bg-white/5 text-nexus-muted text-[10px] font-display font-black rounded-lg uppercase hover:bg-white/10">Dismiss</button>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'users' ? (
          <motion.div 
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="glass-panel rounded-3xl p-8 border-nexus-border"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-display font-black tracking-tight text-nexus-text uppercase">Real User Logins</h3>
              <div className="px-4 py-2 bg-nexus-accent/10 rounded-xl border border-nexus-accent/30">
                <span className="text-[10px] font-display font-black text-nexus-accent uppercase tracking-widest">Total Users: {allUsers.length}</span>
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-nexus-accent" size={32} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-nexus-border">
                      <th className="pb-4 text-[10px] font-black text-nexus-dim uppercase tracking-widest">User</th>
                      <th className="pb-4 text-[10px] font-black text-nexus-dim uppercase tracking-widest">Email</th>
                      <th className="pb-4 text-[10px] font-black text-nexus-dim uppercase tracking-widest">Role</th>
                      <th className="pb-4 text-[10px] font-black text-nexus-dim uppercase tracking-widest">Last Login</th>
                      <th className="pb-4 text-[10px] font-black text-nexus-dim uppercase tracking-widest">Joined</th>
                      <th className="pb-4 text-[10px] font-black text-nexus-dim uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexus-border/50">
                    {allUsers.map((user) => (
                      <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                              <img src={user.avatar || undefined} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-nexus-text text-sm">{user.name}</span>
                              <span className="text-[8px] font-black text-nexus-dim uppercase tracking-widest">{user.country || 'Unknown'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-xs text-nexus-muted font-medium">{user.email}</td>
                        <td className="py-4">
                          <select 
                            value={user.role}
                            onChange={(e) => handleUserAction(user, 'role_change', e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg text-[10px] font-display font-black uppercase tracking-widest text-nexus-accent px-2 py-1 outline-none focus:border-nexus-accent/50"
                          >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-4 text-[10px] text-nexus-dim font-mono">
                          {user.lastLogin?.toDate ? user.lastLogin.toDate().toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-4 text-[10px] text-nexus-dim font-mono">
                          {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Tooltip content="Temporarily restrict user's communication privileges" position="top">
                              <button 
                                onClick={() => handleUserAction(user, 'mute', 'Muted for 24h')}
                                className="p-2 bg-nexus-accent/10 text-nexus-accent rounded-lg hover:bg-nexus-accent hover:text-nexus-dark transition-all"
                              >
                                <VolumeX size={14} />
                              </button>
                            </Tooltip>
                            <Tooltip content="Permanently revoke user's access to the platform" position="top">
                              <button 
                                onClick={() => handleUserAction(user, 'ban', 'Banned for terms violation')}
                                className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                              >
                                <Ban size={14} />
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="logs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="glass-panel rounded-3xl p-8 border-nexus-border"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black tracking-tight text-nexus-text uppercase">Administrative Audit Logs</h3>
              <div className="px-4 py-2 bg-nexus-accent/10 rounded-xl border border-nexus-accent/30">
                <span className="text-[10px] font-black text-nexus-accent uppercase tracking-widest">Total Logs: {adminLogs.length}</span>
              </div>
            </div>

            {loadingLogs ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-nexus-accent" size={32} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-nexus-border">
                      <th className="pb-4 text-[10px] font-black text-nexus-dim uppercase tracking-widest">Admin</th>
                      <th className="pb-4 text-[10px] font-black text-nexus-dim uppercase tracking-widest">Action</th>
                      <th className="pb-4 text-[10px] font-black text-nexus-dim uppercase tracking-widest">Target</th>
                      <th className="pb-4 text-[10px] font-black text-nexus-dim uppercase tracking-widest">Details</th>
                      <th className="pb-4 text-[10px] font-black text-nexus-dim uppercase tracking-widest">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexus-border/50">
                    {adminLogs.map((log) => (
                      <tr key={log.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-4">
                          <span className="font-bold text-nexus-accent text-sm">{log.adminName}</span>
                        </td>
                        <td className="py-4">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${
                            log.action === 'ban' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            log.action === 'role_change' ? 'bg-nexus-accent/10 text-nexus-accent border-nexus-accent/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4 text-sm text-nexus-text font-bold">{log.targetName}</td>
                        <td className="py-4 text-xs text-nexus-dim max-w-xs truncate">{log.details}</td>
                        <td className="py-4 text-[10px] text-nexus-dim font-mono">
                          {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RolePasswordModal = ({ isOpen, onClose, onConfirm, role }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, role: UserRole | null }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1573') {
      onConfirm();
      setPassword('');
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-nexus-dark/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-panel p-8 rounded-[2.5rem] border-nexus-accent/20 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-nexus-accent to-transparent opacity-50" />
        
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-nexus-accent/10 rounded-xl">
              <Shield size={20} className="text-nexus-accent" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-nexus-text uppercase">Elevated Access</h3>
              <p className="text-[10px] text-nexus-dim font-bold uppercase tracking-widest">Password required for {role} role</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-nexus-dim hover:text-nexus-text transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Access Code</label>
            <input 
              autoFocus
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
              className={`w-full bg-white/5 border ${error ? 'border-red-500/50' : 'border-nexus-border'} rounded-2xl px-6 py-4 text-center text-2xl font-black tracking-[1em] focus:outline-none focus:border-nexus-accent/50 transition-all text-nexus-accent placeholder:text-nexus-dim/30`}
            />
            {error && <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest text-center mt-2">Invalid Access Code</p>}
          </div>

          <Tooltip content="Confirm your credentials to proceed" position="bottom">
            <button 
              type="submit"
              className="w-full bg-nexus-accent text-nexus-dark font-black py-4 rounded-2xl shadow-xl shadow-nexus-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
            >
              Verify Identity
            </button>
          </Tooltip>
        </form>
      </motion.div>
    </div>
  );
};

// --- Components ---

const NavButton = ({ icon: Icon, label, active, onClick, tooltip }: { icon: any, label: string, active: boolean, onClick: () => void, tooltip?: string }) => (
  <Tooltip content={tooltip || label} position="bottom">
    <motion.button
      whileHover={{ scale: 1.05, y: -1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl transition-all duration-300 text-[10px] font-black tracking-widest shrink-0 relative group ${
        active 
          ? 'bg-nexus-accent/10 text-nexus-accent border border-nexus-accent/30 shadow-sm' 
          : 'text-nexus-dim hover:bg-white/5 hover:text-nexus-text border border-transparent'
      }`}
    >
      <Icon size={16} className={active ? 'highlight-icon' : 'group-hover:scale-110 transition-transform group-hover:text-nexus-accent'} />
      <span className={`hidden md:inline ${active ? 'highlight-text' : 'group-hover:text-nexus-text'}`}>{label.toUpperCase()}</span>
      {active && (
        <motion.div
          layoutId="nav-active"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-nexus-accent rounded-full shadow-[0_0_12px_var(--nexus-accent-glow)]"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </motion.button>
  </Tooltip>
);

const GameCard = ({ title, players, image, logo, icon: Icon, requiresMatchCode, onClick }: { title: string, players: string, image: string, logo?: string, icon: any, requiresMatchCode?: boolean, onClick?: () => void }) => (
  <motion.div 
    whileHover={{ y: -8, scale: 1.02 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    onClick={onClick}
    className="nexus-card group relative overflow-hidden shadow-xl hover:shadow-nexus-accent/10 cursor-pointer"
  >
    <div className="h-48 overflow-hidden relative">
      <img 
        src={image || undefined} 
        alt={title} 
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-nexus-dark via-nexus-dark/40 to-transparent opacity-90" />
      
      {/* Match Code Badge */}
      {requiresMatchCode && (
        <div className="absolute top-4 left-4 z-20">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 border border-white/20">
            <Lock size={10} />
            Match Code Required
          </div>
        </div>
      )}

      {/* Logo Overlay */}
      {logo && (
        <div className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center">
          <img 
            src={logo || undefined} 
            alt={`${title} logo`} 
            className="max-w-full max-h-full object-contain drop-shadow-2xl filter brightness-110 group-hover:scale-110 transition-transform"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-nexus-accent/20 backdrop-blur-md rounded-lg border border-nexus-accent/30 shadow-lg">
            <Icon size={14} className="highlight-icon text-nexus-accent" />
          </div>
          <span className="text-[10px] font-black text-nexus-accent uppercase tracking-widest highlight-text drop-shadow-sm">Nexus Verified</span>
        </div>
        <h3 className="font-black text-xl text-white leading-tight tracking-tight uppercase highlight-text group-hover:text-nexus-accent transition-colors">{title}</h3>
      </div>
    </div>
    <div className="p-4 bg-white/[0.02] flex items-center justify-between border-t border-nexus-border">
      <div className="flex items-center gap-2 text-xs text-nexus-muted">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{players} Warriors</span>
      </div>
      <button className="text-[10px] font-black text-nexus-accent uppercase tracking-widest hover:underline highlight-text">ENTER</button>
    </div>
  </motion.div>
);

const StatCard = ({ label, value, icon: Icon }: { label: string, value: string, icon: any }) => (
  <Tooltip content={`Current ${label.toLowerCase()} across all regions`} position="top">
    <div className="nexus-card p-6 rounded-2xl flex items-center gap-4 group transition-all duration-500 hover:bg-nexus-surface">
      <div className="p-3 bg-nexus-accent/10 rounded-xl group-hover:bg-nexus-accent/20 transition-colors">
        <Icon size={24} className="text-nexus-accent highlight-icon" />
      </div>
      <div>
        <p className="text-[10px] font-black text-nexus-dim uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black font-mono tracking-tight text-nexus-text highlight-text">{value}</p>
      </div>
    </div>
  </Tooltip>
);

const ServersModal = ({ isOpen, onClose, onJoinServer }: { isOpen: boolean, onClose: () => void, onJoinServer: (name: string) => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Types');
  const [filterRegion, setFilterRegion] = useState('All Regions');

  const servers: Server[] = [
    { id: '1', name: 'Nexus Survival Alpha', type: 'Survival', players: 420, maxPlayers: 500, ping: 12, status: 'online', region: 'US-East' },
    { id: '2', name: 'Creative Paradise', type: 'Creative', players: 150, maxPlayers: 200, ping: 45, status: 'online', region: 'EU-West' },
    { id: '3', name: 'Hardcore Factions', type: 'Factions', players: 890, maxPlayers: 1000, ping: 28, status: 'online', region: 'US-West' },
    { id: '4', name: 'Skyblock Infinity', type: 'Skyblock', players: 1200, maxPlayers: 1500, ping: 32, status: 'online', region: 'Asia-East' },
    { id: '5', name: 'Nexus Minigames', type: 'Minigames', players: 2400, maxPlayers: 3000, ping: 15, status: 'online', region: 'US-East' },
    { id: '6', name: 'Prison Break Elite', type: 'Prison', players: 310, maxPlayers: 400, ping: 55, status: 'online', region: 'EU-Central' },
    { id: '7', name: 'Anarchy Unleashed', type: 'Anarchy', players: 95, maxPlayers: 150, ping: 62, status: 'online', region: 'US-East' },
    { id: '8', name: 'Roleplay City', type: 'RP', players: 540, maxPlayers: 600, ping: 40, status: 'online', region: 'US-West' },
    { id: '9', name: 'Nexus Vanilla+', type: 'Vanilla', players: 120, maxPlayers: 200, ping: 22, status: 'online', region: 'EU-West' },
    { id: '10', name: 'Tournament Arena', type: 'PvP', players: 0, maxPlayers: 100, ping: 10, status: 'maintenance', region: 'Global' },
    { id: '11', name: 'Nexus Survival Beta', type: 'Survival', players: 210, maxPlayers: 500, ping: 18, status: 'online', region: 'US-East' },
    { id: '12', name: 'Creative Builders', type: 'Creative', players: 85, maxPlayers: 200, ping: 48, status: 'online', region: 'EU-West' },
    { id: '13', name: 'Factions War', type: 'Factions', players: 450, maxPlayers: 1000, ping: 30, status: 'online', region: 'US-West' },
    { id: '14', name: 'Skyblock Classic', type: 'Skyblock', players: 600, maxPlayers: 1500, ping: 35, status: 'online', region: 'Asia-East' },
    { id: '15', name: 'Nexus Arcade', type: 'Minigames', players: 1200, maxPlayers: 3000, ping: 20, status: 'online', region: 'US-East' },
    { id: '16', name: 'Nexus RPG World', type: 'RPG', players: 750, maxPlayers: 1000, ping: 25, status: 'online', region: 'EU-North' },
    { id: '17', name: 'Lifesteal SMP', type: 'Survival', players: 320, maxPlayers: 500, ping: 38, status: 'online', region: 'US-Central' },
    { id: '18', name: 'Nexus Bedwars', type: 'Minigames', players: 1800, maxPlayers: 2000, ping: 14, status: 'online', region: 'Global' },
    { id: '19', name: 'OneBlock Challenge', type: 'Skyblock', players: 450, maxPlayers: 800, ping: 42, status: 'online', region: 'EU-West' },
    { id: '20', name: 'Nexus Parkour', type: 'Minigames', players: 150, maxPlayers: 300, ping: 20, status: 'online', region: 'US-East' },
    { id: '21', name: 'Zombie Apocalypse', type: 'Survival', players: 280, maxPlayers: 400, ping: 50, status: 'online', region: 'EU-Central' },
    { id: '22', name: 'Nexus KitPvP', type: 'PvP', players: 400, maxPlayers: 500, ping: 12, status: 'online', region: 'Global' },
    { id: '23', name: 'Earth SMP', type: 'Survival', players: 1100, maxPlayers: 2000, ping: 35, status: 'online', region: 'Global' },
    { id: '24', name: 'Nexus Creative+', type: 'Creative', players: 200, maxPlayers: 500, ping: 40, status: 'online', region: 'US-West' },
    { id: '25', name: 'Hardcore Survival', type: 'Survival', players: 150, maxPlayers: 300, ping: 28, status: 'online', region: 'EU-East' },
    { id: '26', name: 'Cyberpunk City RP', type: 'RP', players: 120, maxPlayers: 200, ping: 35, status: 'online', region: 'US-East' },
    { id: '27', name: 'Medieval Kingdoms', type: 'RPG', players: 450, maxPlayers: 600, ping: 42, status: 'online', region: 'EU-West' },
    { id: '28', name: 'Nexus Battle Royale', type: 'PvP', players: 95, maxPlayers: 100, ping: 15, status: 'online', region: 'Global' },
    { id: '29', name: 'Space Explorers', type: 'Survival', players: 310, maxPlayers: 500, ping: 55, status: 'online', region: 'Asia-East' },
    { id: '30', name: 'Nexus Hide & Seek', type: 'Minigames', players: 80, maxPlayers: 150, ping: 22, status: 'online', region: 'US-West' },
    { id: '31', name: 'Dungeon Crawlers', type: 'RPG', players: 240, maxPlayers: 400, ping: 30, status: 'online', region: 'EU-Central' },
    { id: '32', name: 'Nexus Skywars', type: 'Minigames', players: 1200, maxPlayers: 2000, ping: 18, status: 'online', region: 'Global' },
    { id: '33', name: 'Wild West Frontier', type: 'RP', players: 180, maxPlayers: 300, ping: 45, status: 'online', region: 'US-Central' },
    { id: '34', name: 'Nexus Parkour Pro', type: 'Minigames', players: 60, maxPlayers: 100, ping: 12, status: 'online', region: 'US-East' },
    { id: '35', name: 'Oceanic Survival', type: 'Survival', players: 420, maxPlayers: 800, ping: 65, status: 'online', region: 'Oceania' },
    { id: '36', name: 'Nexus TNT Run', type: 'Minigames', players: 150, maxPlayers: 300, ping: 25, status: 'online', region: 'EU-North' },
    { id: '37', name: 'Magic Academy', type: 'RPG', players: 540, maxPlayers: 1000, ping: 38, status: 'online', region: 'US-West' },
    { id: '38', name: 'Nexus Spleef', type: 'Minigames', players: 40, maxPlayers: 100, ping: 20, status: 'online', region: 'Global' },
    { id: '39', name: 'Wasteland Survival', type: 'Survival', players: 210, maxPlayers: 400, ping: 52, status: 'online', region: 'EU-East' },
    { id: '40', name: 'Nexus Build Battle', type: 'Creative', players: 300, maxPlayers: 600, ping: 30, status: 'online', region: 'US-East' },
    { id: '41', name: 'Pirate Cove RP', type: 'RP', players: 150, maxPlayers: 250, ping: 48, status: 'online', region: 'EU-West' },
    { id: '42', name: 'Nexus Murder Mystery', type: 'Minigames', players: 800, maxPlayers: 1200, ping: 15, status: 'online', region: 'Global' },
    { id: '43', name: 'Ancient Greece RPG', type: 'RPG', players: 320, maxPlayers: 500, ping: 40, status: 'online', region: 'EU-South' },
    { id: '44', name: 'Nexus Speed Builders', type: 'Minigames', players: 120, maxPlayers: 200, ping: 18, status: 'online', region: 'US-West' },
    { id: '45', name: 'Volcano Island SMP', type: 'Survival', players: 450, maxPlayers: 800, ping: 58, status: 'online', region: 'Asia-South' },
    { id: '46', name: 'Nexus The Bridge', type: 'Minigames', players: 600, maxPlayers: 1000, ping: 12, status: 'online', region: 'Global' },
    { id: '47', name: 'Cyber City Life', type: 'RP', players: 280, maxPlayers: 500, ping: 35, status: 'online', region: 'US-East' },
    { id: '48', name: 'Nexus Eggwars', type: 'Minigames', players: 1500, maxPlayers: 2500, ping: 22, status: 'online', region: 'EU-West' },
    { id: '49', name: 'Fantasy Kingdom RPG', type: 'RPG', players: 890, maxPlayers: 1500, ping: 32, status: 'online', region: 'Global' },
    { id: '50', name: 'Nexus Paintball', type: 'Minigames', players: 200, maxPlayers: 400, ping: 25, status: 'online', region: 'US-Central' },
    { id: '51', name: 'Arctic Survival', type: 'Survival', players: 120, maxPlayers: 300, ping: 62, status: 'online', region: 'EU-North' },
    { id: '52', name: 'Nexus Capture The Flag', type: 'Minigames', players: 450, maxPlayers: 800, ping: 18, status: 'online', region: 'Global' },
    { id: '53', name: 'Samurai Era RPG', type: 'RPG', players: 310, maxPlayers: 600, ping: 45, status: 'online', region: 'Asia-East' },
    { id: '54', name: 'Nexus Sumo', type: 'Minigames', players: 80, maxPlayers: 200, ping: 15, status: 'online', region: 'Global' },
    { id: '55', name: 'Steampunk World', type: 'Creative', players: 150, maxPlayers: 400, ping: 50, status: 'online', region: 'US-West' },
    { id: '56', name: 'Nexus Tower Defense', type: 'Minigames', players: 600, maxPlayers: 1200, ping: 28, status: 'online', region: 'EU-Central' },
    { id: '57', name: 'Deep Sea Survival', type: 'Survival', players: 240, maxPlayers: 500, ping: 70, status: 'online', region: 'Oceania' },
    { id: '58', name: 'Nexus Prop Hunt', type: 'Minigames', players: 320, maxPlayers: 600, ping: 22, status: 'online', region: 'Global' },
    { id: '59', name: 'Viking Conquest', type: 'RPG', players: 540, maxPlayers: 1000, ping: 42, status: 'online', region: 'EU-North' },
    { id: '60', name: 'Nexus Block Party', type: 'Minigames', players: 180, maxPlayers: 400, ping: 20, status: 'online', region: 'US-East' },
    { id: '61', name: 'Mars Colony SMP', type: 'Survival', players: 420, maxPlayers: 800, ping: 85, status: 'online', region: 'Global' },
    { id: '62', name: 'Nexus Dropper', type: 'Minigames', players: 120, maxPlayers: 300, ping: 18, status: 'online', region: 'US-West' },
    { id: '63', name: 'Modern City RP', type: 'RP', players: 750, maxPlayers: 1200, ping: 30, status: 'online', region: 'US-East' },
    { id: '64', name: 'Nexus Quake', type: 'Minigames', players: 60, maxPlayers: 150, ping: 12, status: 'online', region: 'Global' },
    { id: '65', name: 'Jungle Survival', type: 'Survival', players: 310, maxPlayers: 600, ping: 55, status: 'online', region: 'Asia-South' },
    { id: '66', name: 'Nexus Micro Battles', type: 'Minigames', players: 450, maxPlayers: 1000, ping: 15, status: 'online', region: 'Global' },
    { id: '67', name: 'Egyptian Empire RPG', type: 'RPG', players: 280, maxPlayers: 500, ping: 48, status: 'online', region: 'EU-South' },
    { id: '68', name: 'Nexus Soccer', type: 'Minigames', players: 150, maxPlayers: 400, ping: 25, status: 'online', region: 'Global' },
    { id: '69', name: 'Skyblock Reborn', type: 'Skyblock', players: 1200, maxPlayers: 2500, ping: 35, status: 'online', region: 'Asia-East' },
    { id: '70', name: 'Nexus Chess', type: 'Minigames', players: 40, maxPlayers: 100, ping: 10, status: 'online', region: 'Global' },
    { id: '71', name: 'Dystopian Future RP', type: 'RP', players: 540, maxPlayers: 1000, ping: 38, status: 'online', region: 'US-West' },
    { id: '72', name: 'Nexus Bowling', type: 'Minigames', players: 80, maxPlayers: 200, ping: 22, status: 'online', region: 'Global' },
    { id: '73', name: 'Island Castaway', type: 'Survival', players: 210, maxPlayers: 500, ping: 65, status: 'online', region: 'Oceania' },
    { id: '74', name: 'Nexus Racing', type: 'Minigames', players: 320, maxPlayers: 800, ping: 18, status: 'online', region: 'Global' },
    { id: '75', name: 'Wizard Wars', type: 'PvP', players: 150, maxPlayers: 300, ping: 28, status: 'online', region: 'EU-West' },
    { id: '76', name: 'Nexus Bedwars Pro', type: 'Minigames', players: 450, maxPlayers: 1000, ping: 12, status: 'online', region: 'Global' },
    { id: '77', name: 'Skygrid Survival', type: 'Skyblock', players: 120, maxPlayers: 300, ping: 35, status: 'online', region: 'US-East' },
    { id: '78', name: 'Nexus UHC Run', type: 'PvP', players: 100, maxPlayers: 100, ping: 15, status: 'online', region: 'Global' },
    { id: '79', name: 'The Bridges', type: 'Minigames', players: 320, maxPlayers: 600, ping: 22, status: 'online', region: 'EU-West' },
    { id: '80', name: 'Nexus Walls', type: 'Minigames', players: 180, maxPlayers: 400, ping: 25, status: 'online', region: 'US-Central' },
    { id: '81', name: 'Survival Games', type: 'PvP', players: 600, maxPlayers: 1200, ping: 18, status: 'online', region: 'Global' },
    { id: '82', name: 'Creative Plus', type: 'Creative', players: 240, maxPlayers: 500, ping: 42, status: 'online', region: 'US-West' },
    { id: '83', name: 'Hardcore Plus', type: 'Survival', players: 45, maxPlayers: 100, ping: 50, status: 'online', region: 'EU-North' },
    { id: '84', name: 'Factions Plus', type: 'Factions', players: 750, maxPlayers: 1500, ping: 32, status: 'online', region: 'US-East' },
    { id: '85', name: 'Skyblock Plus', type: 'Skyblock', players: 1800, maxPlayers: 3000, ping: 28, status: 'online', region: 'Global' },
    { id: '86', name: 'Prison Plus', type: 'Prison', players: 540, maxPlayers: 1000, ping: 45, status: 'online', region: 'EU-Central' },
    { id: '87', name: 'Anarchy Plus', type: 'Anarchy', players: 120, maxPlayers: 300, ping: 68, status: 'online', region: 'US-East' },
    { id: '88', name: 'Roleplay Plus', type: 'RP', players: 890, maxPlayers: 1500, ping: 38, status: 'online', region: 'US-WEST' },
    { id: '89', name: 'Vanilla Plus', type: 'Vanilla', players: 310, maxPlayers: 600, ping: 25, status: 'online', region: 'EU-WEST' },
    { id: '90', name: 'PvP Plus', type: 'PvP', players: 1200, maxPlayers: 2000, ping: 12, status: 'online', region: 'Global' },
    { id: '91', name: 'RPG Plus', type: 'RPG', players: 1500, maxPlayers: 3000, ping: 30, status: 'online', region: 'EU-NORTH' },
    { id: '92', name: 'Lifesteal Plus', type: 'Survival', players: 600, maxPlayers: 1200, ping: 42, status: 'online', region: 'US-CENTRAL' },
    { id: '93', name: 'OneBlock Plus', type: 'Skyblock', players: 1100, maxPlayers: 2000, ping: 45, status: 'online', region: 'EU-WEST' },
    { id: '94', name: 'Parkour Plus', type: 'Minigames', players: 450, maxPlayers: 1000, ping: 22, status: 'online', region: 'US-EAST' },
    { id: '95', name: 'Zombie Plus', type: 'Survival', players: 540, maxPlayers: 1000, ping: 55, status: 'online', region: 'EU-CENTRAL' },
    { id: '96', name: 'Earth Plus', type: 'Survival', players: 2800, maxPlayers: 5000, ping: 35, status: 'online', region: 'Global' },
    { id: '97', name: 'KitPvP Plus', type: 'PvP', players: 800, maxPlayers: 1500, ping: 15, status: 'online', region: 'Global' },
    { id: '98', name: 'Cyberpunk Plus', type: 'RP', players: 320, maxPlayers: 600, ping: 40, status: 'online', region: 'US-EAST' },
    { id: '99', name: 'Medieval Plus', type: 'RPG', players: 750, maxPlayers: 1200, ping: 48, status: 'online', region: 'EU-WEST' },
    { id: '100', name: 'Nexus Gold Exclusive', type: 'Gold', players: 100, maxPlayers: 1000, ping: 5, status: 'online', region: 'Global' },
    { id: '101', name: 'Skygrid+', type: 'Skyblock', players: 150, maxPlayers: 300, ping: 32, status: 'online', region: 'US-East' },
    { id: '102', name: 'UHC Run+', type: 'PvP', players: 120, maxPlayers: 120, ping: 18, status: 'online', region: 'Global' },
    { id: '103', name: 'Bridges+', type: 'Minigames', players: 400, maxPlayers: 800, ping: 25, status: 'online', region: 'EU-West' },
    { id: '104', name: 'Walls+', type: 'Minigames', players: 250, maxPlayers: 500, ping: 28, status: 'online', region: 'US-Central' },
    { id: '105', name: 'Survival Games+', type: 'PvP', players: 800, maxPlayers: 1500, ping: 20, status: 'online', region: 'Global' },
    { id: '106', name: 'Creative Pro', type: 'Creative', players: 300, maxPlayers: 600, ping: 45, status: 'online', region: 'US-West' },
    { id: '107', name: 'Hardcore Pro', type: 'Survival', players: 60, maxPlayers: 120, ping: 55, status: 'online', region: 'EU-North' },
    { id: '108', name: 'Factions Pro', type: 'Factions', players: 1000, maxPlayers: 2000, ping: 30, status: 'online', region: 'US-East' },
    { id: '109', name: 'Skyblock Pro', type: 'Skyblock', players: 2000, maxPlayers: 4000, ping: 22, status: 'online', region: 'Global' },
    { id: '110', name: 'Prison Pro', type: 'Prison', players: 700, maxPlayers: 1200, ping: 48, status: 'online', region: 'EU-Central' },
    { id: '111', name: 'Anarchy Pro', type: 'Anarchy', players: 200, maxPlayers: 400, ping: 70, status: 'online', region: 'US-East' },
    { id: '112', name: 'Roleplay Pro', type: 'RP', players: 1200, maxPlayers: 2000, ping: 42, status: 'online', region: 'US-WEST' },
    { id: '113', name: 'Vanilla Pro', type: 'Vanilla', players: 400, maxPlayers: 800, ping: 28, status: 'online', region: 'EU-WEST' },
    { id: '114', name: 'PvP Pro', type: 'PvP', players: 1500, maxPlayers: 2500, ping: 15, status: 'online', region: 'Global' },
    { id: '115', name: 'RPG Pro', type: 'RPG', players: 2000, maxPlayers: 4000, ping: 28, status: 'online', region: 'EU-NORTH' },
    { id: '116', name: 'Lifesteal Pro', type: 'Survival', players: 800, maxPlayers: 1500, ping: 40, status: 'online', region: 'US-CENTRAL' },
    { id: '117', name: 'OneBlock Pro', type: 'Skyblock', players: 1500, maxPlayers: 2500, ping: 48, status: 'online', region: 'EU-WEST' },
    { id: '118', name: 'Parkour Pro', type: 'Minigames', players: 600, maxPlayers: 1200, ping: 25, status: 'online', region: 'US-EAST' },
    { id: '119', name: 'Zombie Pro', type: 'Survival', players: 700, maxPlayers: 1200, ping: 58, status: 'online', region: 'EU-CENTRAL' },
    { id: '120', name: 'Earth Pro', type: 'Survival', players: 3500, maxPlayers: 6000, ping: 38, status: 'online', region: 'Global' },
    { id: '121', name: 'KitPvP Pro', type: 'PvP', players: 1000, maxPlayers: 2000, ping: 18, status: 'online', region: 'Global' },
    { id: '122', name: 'Cyberpunk Pro', type: 'RP', players: 400, maxPlayers: 800, ping: 42, status: 'online', region: 'US-EAST' },
    { id: '123', name: 'Medieval Pro', type: 'RPG', players: 1000, maxPlayers: 1500, ping: 50, status: 'online', region: 'EU-WEST' },
    { id: '124', name: 'Battle Royale Pro', type: 'PvP', players: 300, maxPlayers: 300, ping: 18, status: 'online', region: 'Global' },
    { id: '125', name: 'Space Pro', type: 'Survival', players: 700, maxPlayers: 1200, ping: 60, status: 'online', region: 'ASIA-EAST' },
  ];

  const types = ['All Types', ...new Set(servers.map(s => s.type))];
  const regions = ['All Regions', ...new Set(servers.map(s => s.region))];

  const filteredServers = servers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         server.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All Types' || server.type === filterType;
    const matchesRegion = filterRegion === 'All Regions' || server.region === filterRegion;
    return matchesSearch && matchesType && matchesRegion;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-nexus-dark/90 backdrop-blur-xl" 
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="w-full max-w-5xl h-[85vh] glass-panel rounded-[2.5rem] flex flex-col relative z-10 shadow-2xl border-white/10 overflow-hidden"
          >
            <div className="p-8 border-b border-white/5 flex flex-col gap-6 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-nexus-accent/10 rounded-2xl">
                    <Globe size={28} className="text-nexus-accent" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase text-nexus-text">NEXUS GLOBAL SERVERS</h2>
                    <p className="text-nexus-muted text-sm font-medium">Browse and connect to our high-performance network</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-colors">
                  <X size={24} className="text-nexus-muted" />
                </button>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-nexus-dim" size={16} />
                  <Tooltip content="Filter servers by name or game type" position="top">
                    <input 
                      type="text" 
                      placeholder="Search by server name or type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-nexus-border rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:outline-none focus:border-nexus-accent/30 transition-all text-nexus-text placeholder:text-nexus-dim"
                    />
                  </Tooltip>
                </div>
                <div className="flex gap-4">
                  <Tooltip content="Filter by game mode" position="top">
                    <select 
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="bg-white/5 border border-nexus-border rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-nexus-text focus:outline-none focus:border-nexus-accent/30 transition-all appearance-none cursor-pointer min-w-[140px]"
                    >
                      {types.map(t => <option key={t} value={t} className="bg-nexus-dark">{t.toUpperCase()}</option>)}
                    </select>
                  </Tooltip>
                  <Tooltip content="Filter by server location" position="top">
                    <select 
                      value={filterRegion}
                      onChange={(e) => setFilterRegion(e.target.value)}
                      className="bg-white/5 border border-nexus-border rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-nexus-text focus:outline-none focus:border-nexus-accent/30 transition-all appearance-none cursor-pointer min-w-[140px]"
                    >
                      {regions.map(r => <option key={r} value={r} className="bg-nexus-dark">{r.toUpperCase()}</option>)}
                    </select>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-12 px-6 py-2 text-[10px] font-black text-nexus-dim uppercase tracking-widest">
                <div className="col-span-5">Server Name</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Players</div>
                <div className="col-span-1">Ping</div>
                <div className="col-span-2 text-right">Action</div>
              </div>

              {filteredServers.length > 0 ? (
                filteredServers.map((server) => (
                  <motion.div 
                    key={server.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ x: 10, backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                    className="grid grid-cols-12 items-center px-6 py-5 nexus-card rounded-2xl border-nexus-border group transition-all"
                  >
                    <div className="col-span-5 flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${server.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : server.status === 'maintenance' ? 'bg-nexus-accent' : 'bg-red-500'}`} />
                      <div>
                        <p className="font-black text-sm tracking-tight group-hover:text-nexus-accent transition-colors text-nexus-text">{server.name}</p>
                        <p className="text-[10px] text-nexus-dim font-bold uppercase tracking-widest">{server.region}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="px-2 py-1 bg-white/5 rounded-md text-[9px] font-black text-nexus-muted uppercase tracking-widest">
                        {server.type}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 text-nexus-text">
                      <Users size={12} className="text-nexus-dim" />
                      <span className="text-xs font-bold font-mono">{server.players}/{server.maxPlayers}</span>
                    </div>
                    <div className="col-span-1 flex items-center gap-1 text-nexus-text">
                      <Signal size={12} className={server.ping < 30 ? 'text-green-500' : 'text-nexus-accent'} />
                      <span className="text-xs font-bold font-mono">{server.ping}ms</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <Tooltip content={server.status === 'online' ? `Join ${server.name} now` : 'Server currently unavailable'} position="left">
                        <button 
                          onClick={() => onJoinServer(server.name)}
                          disabled={server.status !== 'online'}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                            server.status === 'online' 
                              ? 'bg-nexus-accent text-white hover:scale-105 shadow-lg shadow-nexus-accent/10' 
                              : 'bg-white/5 text-nexus-dim cursor-not-allowed'
                          }`}
                        >
                          {server.status === 'online' ? 'CONNECT' : server.status.toUpperCase()}
                        </button>
                      </Tooltip>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-nexus-dim">
                  <Search size={48} className="mb-4 opacity-20" />
                  <p className="font-black uppercase tracking-widest text-xs">No servers match your criteria</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-white/[0.02] border-t border-nexus-border flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] font-bold text-nexus-dim uppercase tracking-widest">14 Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-nexus-accent" />
                  <span className="text-[10px] font-bold text-nexus-dim uppercase tracking-widest">1 Maintenance</span>
                </div>
              </div>
              <p className="text-[10px] font-black text-nexus-dim tracking-widest uppercase">Nexus Network v4.2.0 • Global Latency: 24ms</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const PaymentModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [step, setStep] = useState<'plans' | 'method' | 'card' | 'mobile' | 'otp' | 'success' | 'declined'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bkash' | 'nagad'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [mobileData, setMobileData] = useState({
    number: '',
    otp: '',
    pin: '',
    trxId: ''
  });

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    
    // Simulate API call with validation
    setTimeout(() => {
      setIsProcessing(false);
      
      if (paymentMethod === 'card') {
        const digitsOnly = cardData.number.replace(/\D/g, '');
        // Validation: Must be 16 digits and not a "fake" pattern like all zeros
        if (digitsOnly.length < 16 || /^0+$/.test(digitsOnly)) {
          setStep('declined');
          setError('The card number provided is insufficient or invalid. Please check your details and try again.');
          return;
        }
      }
      
      setStep('success');
      console.log('Payment processed via:', paymentMethod, paymentMethod === 'card' ? cardData : mobileData);
    }, 2000);
  };

  const resetModal = () => {
    setStep('plans');
    setCardData({ number: '', expiry: '', cvc: '', name: '' });
    setMobileData({ number: '', otp: '', pin: '' });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={resetModal}
            className="absolute inset-0 bg-nexus-dark/90 backdrop-blur-xl" 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-lg glass-panel rounded-[2.5rem] p-6 md:p-10 relative z-10 shadow-2xl border-nexus-accent/20 overflow-hidden"
          >
            <button onClick={resetModal} className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors z-20">
              <X size={20} className="text-nexus-muted" />
            </button>

            <AnimatePresence mode="wait">
              {step === 'plans' && (
                <motion.div
                  key="plans"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-nexus-accent/10 rounded-3xl mb-4 shadow-lg shadow-nexus-accent/10">
                      <Crown size={32} className="text-nexus-accent highlight-icon" />
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h2 className="text-3xl font-black tracking-tighter uppercase text-nexus-text highlight-text">NEXUS HUB</h2>
                      <div className="nexus-plus-badge">
                        <Star size={8} className="fill-current" />
                        <span>PLUS</span>
                      </div>
                    </div>
                    <p className="text-nexus-muted mt-2 text-sm font-medium opacity-80">Unlock the ultimate community experience</p>
                  </div>

                  <div className="space-y-4 mb-8">
                    {[
                      "Priority access to all 800+ servers",
                      "Exclusive 'NEXUS+' badge and gold name",
                      "10,000 Nexus Credits monthly",
                      "Ad-free community experience",
                      "Early access to new realms"
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm font-medium group">
                        <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20 group-hover:scale-110 transition-transform">
                          <Check size={12} className="text-green-500" />
                        </div>
                        <span className="text-nexus-muted group-hover:text-nexus-text transition-colors">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <button 
                      onClick={() => setSelectedPlan('monthly')}
                      className={`p-5 nexus-card rounded-3xl text-left transition-all ${selectedPlan === 'monthly' ? 'border-nexus-accent bg-nexus-accent/5' : 'border-nexus-border hover:bg-nexus-surface'}`}
                    >
                      <p className="text-[10px] font-black text-nexus-dim mb-1 tracking-widest uppercase">MONTHLY</p>
                      <p className="text-2xl font-black text-nexus-text">$9.99</p>
                      <p className="text-[9px] text-nexus-accent mt-2 font-bold uppercase tracking-widest">Flexible</p>
                    </button>
                    <button 
                      onClick={() => setSelectedPlan('annual')}
                      className={`p-5 nexus-card rounded-3xl text-left relative overflow-hidden transition-all ${selectedPlan === 'annual' ? 'border-nexus-accent bg-nexus-accent/5' : 'border-nexus-border hover:bg-nexus-surface'}`}
                    >
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-nexus-accent text-white text-[7px] font-black rounded-full uppercase tracking-tighter">BEST VALUE</div>
                      <p className="text-[10px] font-black text-nexus-dim mb-1 tracking-widest uppercase">ANNUAL</p>
                      <p className="text-2xl font-black text-nexus-text">$89.99</p>
                      <p className="text-[9px] text-nexus-accent mt-2 font-bold uppercase tracking-widest">Save 25%</p>
                    </button>
                  </div>

                  <button 
                    onClick={() => setStep('method')}
                    className="w-full bg-nexus-accent text-white font-black py-5 rounded-2xl shadow-xl shadow-nexus-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest highlight-text"
                  >
                    CONTINUE TO PAYMENT
                  </button>
                </motion.div>
              )}

              {step === 'method' && (
                <motion.div
                  key="method"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <button 
                    onClick={() => setStep('plans')}
                    className="flex items-center gap-2 text-nexus-muted hover:text-nexus-text transition-colors mb-6 text-xs font-bold uppercase tracking-widest"
                  >
                    <ArrowLeft size={14} />
                    Back to plans
                  </button>

                  <div className="mb-8">
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-nexus-text">CHOOSE METHOD</h2>
                    <p className="text-nexus-muted text-sm mt-1">Select your preferred payment gateway</p>
                  </div>

                  <div className="space-y-4">
                    <button 
                      onClick={() => { setPaymentMethod('card'); setStep('card'); }}
                      className="w-full p-6 nexus-card rounded-3xl border-nexus-border hover:border-nexus-accent/50 hover:bg-nexus-accent/5 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-nexus-accent/10 transition-colors">
                          <CreditCard size={24} className="text-nexus-muted group-hover:text-nexus-accent" />
                        </div>
                        <div className="text-left">
                          <p className="font-black uppercase tracking-tight text-nexus-text">Credit / Debit Card</p>
                          <p className="text-[10px] text-nexus-dim font-bold uppercase tracking-widest">Visa, Mastercard, Amex</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-nexus-dim group-hover:text-nexus-accent" />
                    </button>

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => { setPaymentMethod('bkash'); setStep('mobile'); }}
                        className="p-6 nexus-card rounded-3xl border-nexus-border hover:border-[#D12053]/50 hover:bg-[#D12053]/5 transition-all flex flex-col items-center gap-3 group"
                      >
                        <div className="w-12 h-12 bg-[#D12053]/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="text-[#D12053] font-black text-xs">bKash</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-nexus-dim group-hover:text-nexus-text">bKash Wallet</p>
                      </button>
                      <button 
                        onClick={() => { setPaymentMethod('nagad'); setStep('mobile'); }}
                        className="p-6 nexus-card rounded-3xl border-nexus-border hover:border-[#F7941D]/50 hover:bg-[#F7941D]/5 transition-all flex flex-col items-center gap-3 group"
                      >
                        <div className="w-12 h-12 bg-[#F7941D]/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="text-[#F7941D] font-black text-xs">Nagad</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-nexus-dim group-hover:text-nexus-text">Nagad Wallet</p>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 'card' && (
                <motion.div
                  key="card"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <button 
                    onClick={() => setStep('method')}
                    className="flex items-center gap-2 text-nexus-muted hover:text-nexus-text transition-colors mb-6 text-xs font-bold uppercase tracking-widest"
                  >
                    <ArrowLeft size={14} />
                    Back to methods
                  </button>

                  <div className="mb-8">
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-nexus-text">CARD PAYMENT</h2>
                    <p className="text-nexus-muted text-sm mt-1">Enter your card details to activate Prime</p>
                  </div>

                  <form onSubmit={handlePayment} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Cardholder Name</label>
                      <input 
                        required
                        type="text"
                        placeholder="JOHN DOE"
                        className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-nexus-accent/50 transition-colors placeholder:text-nexus-dim uppercase text-nexus-text"
                        value={cardData.name}
                        onChange={(e) => setCardData({...cardData, name: e.target.value})}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Card Number</label>
                      <div className="relative">
                        <input 
                          required
                          type="text"
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-nexus-accent/50 transition-colors placeholder:text-nexus-dim font-mono text-nexus-text"
                          value={cardData.number}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                            setCardData({...cardData, number: val});
                          }}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                          <CreditCard size={18} className="text-nexus-dim" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Expiry Date</label>
                        <input 
                          required
                          type="text"
                          placeholder="MM / YY"
                          maxLength={5}
                          className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-nexus-accent/50 transition-colors placeholder:text-nexus-dim font-mono text-nexus-text"
                          value={cardData.expiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                            setCardData({...cardData, expiry: val});
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">CVC</label>
                        <input 
                          required
                          type="text"
                          placeholder="123"
                          maxLength={3}
                          className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:border-nexus-accent/50 transition-colors placeholder:text-nexus-dim font-mono text-nexus-text"
                          value={cardData.cvc}
                          onChange={(e) => setCardData({...cardData, cvc: e.target.value.replace(/\D/g, '')})}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 py-2 text-[10px] text-nexus-dim font-bold uppercase tracking-widest">
                      <Lock size={12} className="text-green-500" />
                      <span>Encrypted & Secure Transaction</span>
                    </div>

                    <button 
                      type="submit"
                      disabled={isProcessing}
                      className="w-full bg-nexus-accent text-white font-black py-5 rounded-2xl shadow-xl shadow-nexus-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-70 disabled:scale-100 highlight-text"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 size={20} className="animate-spin highlight-icon" />
                          PROCESSING...
                        </>
                      ) : (
                        `PAY ${selectedPlan === 'monthly' ? '$9.99' : '$89.99'}`
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 'mobile' && (
                <motion.div
                  key="mobile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <button 
                    onClick={() => setStep('method')}
                    className="flex items-center gap-2 text-nexus-muted hover:text-nexus-text transition-colors mb-6 text-xs font-bold uppercase tracking-widest"
                  >
                    <ArrowLeft size={14} />
                    Back to methods
                  </button>

                  <div className="mb-8">
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-nexus-text">{paymentMethod} PAYMENT</h2>
                    <p className="text-nexus-muted text-sm mt-1">Follow instructions below to complete payment</p>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 nexus-card rounded-3xl border-nexus-border bg-white/[0.02] space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-nexus-dim uppercase tracking-widest">Send Money To</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black tracking-widest text-nexus-text">01706329370</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText('01706329370');
                              // Add a simple visual feedback if needed
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg text-nexus-accent transition-all"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="h-px bg-white/5" />
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-nexus-dim uppercase tracking-widest">Amount to Pay</p>
                        <p className="text-xl font-black text-nexus-text">
                          {selectedPlan === 'monthly' ? '1,150' : '10,500'} BDT
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handlePayment} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Your {paymentMethod} Number</label>
                        <input 
                          required
                          type="text"
                          placeholder="01XXXXXXXXX"
                          maxLength={11}
                          className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-4 text-sm font-black focus:outline-none focus:border-nexus-accent/50 transition-colors placeholder:text-nexus-dim font-mono tracking-widest text-nexus-text"
                          value={mobileData.number}
                          onChange={(e) => setMobileData({...mobileData, number: e.target.value.replace(/\D/g, '')})}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Transaction ID (TRX ID)</label>
                        <input 
                          required
                          type="text"
                          placeholder="TRX12345678"
                          className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-4 text-sm font-black focus:outline-none focus:border-nexus-accent/50 transition-colors placeholder:text-nexus-dim font-mono tracking-widest text-nexus-text uppercase"
                          value={mobileData.trxId}
                          onChange={(e) => setMobileData({...mobileData, trxId: e.target.value.toUpperCase()})}
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={isProcessing}
                        className={`w-full font-black py-5 rounded-2xl shadow-xl transition-all uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-70 highlight-text ${
                          paymentMethod === 'bkash' ? 'bg-[#D12053] text-white shadow-[#D12053]/20' : 'bg-[#F7941D] text-white shadow-[#F7941D]/20'
                        }`}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 size={20} className="animate-spin highlight-icon" />
                            VERIFYING...
                          </>
                        ) : 'CONFIRM PAYMENT'}
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}

              {step === 'declined' && (
                <motion.div
                  key="declined"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <X size={40} className="text-red-500" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase text-red-500">CARD DECLINED</h2>
                  <p className="text-nexus-muted mt-4 text-sm max-w-xs mx-auto leading-relaxed">
                    {error || "Your transaction could not be completed. Please verify your card details or use a different payment method."}
                  </p>
                  <div className="mt-10 flex flex-col gap-3">
                    <button 
                      onClick={() => setStep('card')}
                      className="w-full bg-white/5 border border-nexus-border text-nexus-text font-black py-4 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-xs"
                    >
                      TRY AGAIN
                    </button>
                    <button 
                      onClick={() => setStep('method')}
                      className="w-full text-nexus-dim font-bold py-2 hover:text-nexus-text transition-all uppercase tracking-widest text-[10px]"
                    >
                      CHOOSE ANOTHER METHOD
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-10"
                >
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check size={40} className="text-green-500" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase mb-2 text-nexus-text">WELCOME TO PRIME</h2>
                  <p className="text-nexus-muted mb-8">Your {paymentMethod === 'card' ? 'card' : paymentMethod} has been linked and your membership is active.</p>
                  
                  <div className="nexus-card p-6 rounded-3xl border-nexus-accent/20 mb-8 text-left">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-nexus-dim uppercase tracking-widest">Active Plan</span>
                      <div className="nexus-plus-badge">
                        <Star size={8} className="fill-current" />
                        <span>NEXUS+</span>
                      </div>
                    </div>
                    <p className="text-xl font-black uppercase text-nexus-text highlight-text">{selectedPlan} MEMBERSHIP</p>
                    <p className="text-xs text-nexus-dim mt-1">Next billing date: April 30, 2026</p>
                  </div>

                  <button 
                    onClick={resetModal}
                    className="w-full bg-nexus-accent text-white font-black py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest highlight-text"
                  >
                    GO TO DASHBOARD
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const ConnectingModal = ({ isOpen, error, onClose }: { isOpen: boolean, error: string | null, onClose: () => void }) => (
  <AnimatePresence>
    {(isOpen || error) && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-nexus-dark/95 backdrop-blur-2xl" 
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm glass-panel p-10 rounded-[3rem] text-center relative z-10 border-white/10 shadow-2xl"
        >
          {isOpen && !error && (
            <div className="space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-nexus-accent/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-nexus-accent border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Globe size={32} className="text-nexus-accent animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tighter uppercase text-nexus-text highlight-text">ESTABLISHING LINK</h3>
                <p className="text-nexus-muted text-sm mt-2 font-medium">Connecting to Nexus secure gateway...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                <WifiOff size={32} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tighter uppercase text-red-500">CONNECTION FAILED</h3>
                <p className="text-nexus-muted text-sm mt-3 font-medium leading-relaxed uppercase tracking-tight">{error}</p>
              </div>
              <button 
                onClick={onClose}
                className="w-full bg-white/5 border border-nexus-border text-nexus-text font-black py-4 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-xs highlight-text"
              >
                RETRY CONNECTION
              </button>
            </div>
          )}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const NexusGoldModal = ({ isOpen, onClose, onActivate }: { isOpen: boolean, onClose: () => void, onActivate: (key: string) => void }) => {
  const [accessKey, setAccessKey] = useState('');
  const [showNoKeyMessage, setShowNoKeyMessage] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isFakeLoading, setIsFakeLoading] = useState(false);

  const handleActivate = async () => {
    if (!accessKey.trim()) return;
    setIsActivating(true);
    
    if (accessKey === '112233') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsFakeLoading(true);
      setIsActivating(false);
      return;
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    onActivate(accessKey);
    setIsActivating(false);
    setAccessKey('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={isFakeLoading ? undefined : onClose}
            className="absolute inset-0 bg-nexus-dark/95 backdrop-blur-3xl" 
          />
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="w-full max-w-md glass-panel p-10 rounded-[3rem] relative z-10 border-nexus-gold/30 shadow-[0_0_50px_rgba(212,175,55,0.2)] overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-nexus-gold to-transparent" />
            
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-nexus-gold/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-nexus-gold/30 shadow-[0_0_30px_rgba(212,175,55,0.2)] group">
                <Crown size={48} className="text-nexus-gold animate-pulse drop-shadow-[0_0_15px_rgba(212,175,55,0.8)]" />
              </div>
              <h2 className="text-4xl font-black tracking-tighter uppercase text-white italic highlight-text drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">ENTER NEXUS GOLD</h2>
              <p className="text-nexus-gold/60 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Exclusive Access Protocol</p>
            </div>

            {isFakeLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-8">
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-24 h-24 border-4 border-nexus-gold/20 border-t-nexus-gold rounded-full"
                  />
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 w-24 h-24 border-4 border-transparent border-b-nexus-accent rounded-full scale-75"
                  />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-black text-white tracking-widest animate-pulse">INITIALIZING GOLD ACCESS...</h3>
                  <p className="text-nexus-gold/40 text-[10px] font-black uppercase tracking-[0.3em]">Decrypting secure protocols</p>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-full h-full bg-gradient-to-r from-transparent via-nexus-gold to-transparent"
                  />
                </div>
              </div>
            ) : !showNoKeyMessage ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-nexus-gold/40 uppercase tracking-widest ml-1">Activation Key Required</label>
                  <input 
                    type="text" 
                    placeholder="ENTER ACCESS KEY..."
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                    className="w-full bg-nexus-gold/5 border border-nexus-gold/20 rounded-2xl px-6 py-5 text-sm font-black tracking-[0.5em] focus:outline-none focus:border-nexus-gold/50 transition-all text-center text-white placeholder:text-nexus-gold/20"
                  />
                </div>
                
                <button 
                  onClick={handleActivate}
                  disabled={isActivating || !accessKey.trim()}
                  className="w-full bg-nexus-gold text-nexus-dark font-black py-5 rounded-2xl shadow-xl shadow-nexus-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-xs highlight-text disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isActivating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      VALIDATING...
                    </>
                  ) : (
                    'ACTIVATE GOLD'
                  )}
                </button>
                
                <button 
                  onClick={() => setShowNoKeyMessage(true)}
                  className="w-full text-nexus-gold/60 font-black text-[10px] uppercase tracking-widest hover:text-nexus-gold transition-colors"
                >
                  Don't have a key?
                </button>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center space-y-6"
              >
                <p className="text-nexus-text text-sm font-bold leading-relaxed uppercase tracking-tight">
                  only old followers has the key. If you’re one of the old followers,you should’ve got the key and if u still didn’t,probably you missed it now you cannot access nexus gold without activation key.
                </p>
                <button 
                  onClick={() => setShowNoKeyMessage(false)}
                  className="text-nexus-accent font-black text-[10px] uppercase tracking-widest hover:underline"
                >
                  GO BACK
                </button>
              </motion.div>
            )}
            
            {!isFakeLoading && (
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={20} className="text-nexus-dim" />
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const LoginScreen = ({ onLogin, onNexusGold }: { onLogin: (isGuest?: boolean) => void, onNexusGold: () => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogin) {
      if (!validateEmail(email)) {
        setError('Please enter a valid email address.');
        return;
      }
      if (username.length < 3) {
        setError('Username must be at least 3 characters.');
        return;
      }
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    onLogin();
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-nexus-dark">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-nexus-accent/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-nexus-accent/5 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-nexus-accent mb-6 shadow-2xl shadow-nexus-accent/40">
            <Zap size={32} className="text-white fill-current highlight-icon" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-4xl font-black tracking-tighter text-nexus-text highlight-text uppercase italic">NEXUS HUB</h1>
            <div className="nexus-plus-badge">
              <Star size={8} className="fill-current" />
              <span>PLUS</span>
            </div>
          </div>
          <p className="text-nexus-dim text-[10px] font-black uppercase tracking-[0.3em]">The Ultimate Gaming Network</p>
        </div>

        <div className="glass-panel p-8 rounded-3xl shadow-2xl">
          <div className="flex gap-4 mb-8">
            <button 
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 pb-2 text-sm font-semibold transition-all ${isLogin ? 'text-nexus-accent border-b-2 border-nexus-accent' : 'text-nexus-dim'}`}
            >
              LOGIN
            </button>
            <button 
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 pb-2 text-sm font-semibold transition-all ${!isLogin ? 'text-nexus-accent border-b-2 border-nexus-accent' : 'text-nexus-dim'}`}
            >
              SIGN UP
            </button>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold text-center uppercase tracking-widest"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-nexus-muted uppercase tracking-widest mb-2">Email Address</label>
                <input 
                  required
                  type="email" 
                  placeholder="warrior@nexus.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3 focus:outline-none focus:border-nexus-accent/50 transition-all text-nexus-text placeholder:text-nexus-dim"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-nexus-muted uppercase tracking-widest mb-2">
                {isLogin ? 'Username or Email' : 'Username'}
              </label>
              <input 
                required
                type="text" 
                placeholder={isLogin ? "nexus_warrior" : "warrior_name"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3 focus:outline-none focus:border-nexus-accent/50 transition-all text-nexus-text placeholder:text-nexus-dim"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-nexus-muted uppercase tracking-widest mb-2">Password</label>
              <input 
                required
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3 focus:outline-none focus:border-nexus-accent/50 transition-all text-nexus-text placeholder:text-nexus-dim"
              />
            </div>
            
            <button 
              type="submit"
              className="w-full bg-nexus-accent text-white font-black py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-nexus-accent/20 mt-4 uppercase tracking-widest text-xs highlight-text"
            >
              {isLogin ? 'ENTER NEXUS' : 'JOIN COMMUNITY'}
            </button>

            <button 
              type="button"
              onClick={onNexusGold}
              className="w-full relative overflow-hidden bg-gradient-to-r from-nexus-gold via-yellow-400 to-nexus-gold text-nexus-dark font-black py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-nexus-gold/30 mt-2 uppercase tracking-widest text-xs highlight-text border border-white/20 group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shine" />
              <div className="flex items-center justify-center gap-2">
                <Crown size={18} className="text-nexus-gold animate-pulse drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]" />
                <span className="text-nexus-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]">ENTER NEXUS GOLD</span>
              </div>
            </button>
            <div className="text-center mt-4">
              <button 
                type="button"
                onClick={onNexusGold}
                className="text-[10px] font-black text-nexus-dim uppercase tracking-widest hover:text-nexus-gold transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <Key size={10} />
                Forgot your access key?
              </button>
            </div>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-nexus-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-nexus-surface px-4 text-nexus-dim font-black tracking-widest">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={async () => {
                try {
                  await signInWithPopup(auth, googleProvider);
                } catch (err: any) {
                  setError(err.message);
                }
              }}
              className="w-full bg-white/5 border border-nexus-border text-nexus-text font-black py-4 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest highlight-text"
            >
              <Globe size={18} className="text-nexus-accent highlight-icon" />
              GOOGLE
            </button>
            <button 
              onClick={() => onLogin(true)}
              className="w-full bg-white/5 border border-nexus-border text-nexus-dim font-black py-4 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest"
            >
              <User size={18} className="highlight-icon" />
              GUEST
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-nexus-border text-center">
            <a href="#" className="text-xs text-nexus-dim hover:text-nexus-accent transition-colors">Forgot your access key?</a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showDashboard, setShowDashboard] = useState(true);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isServersOpen, setIsServersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [chatInput, setChatInput] = useState('');
  const [friendSearch, setFriendSearch] = useState('');
  const [serverSearch, setServerSearch] = useState('');
  const [serverFilter, setServerFilter] = useState<'ALL' | 'ONLINE' | 'MAINTENANCE'>('ALL');
  const [serverTypeFilter, setServerTypeFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<{ name: string, avatar: string } | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoginRequiredOpen, setIsLoginRequiredOpen] = useState(false);
  const [isConnectingToServer, setIsConnectingToServer] = useState(false);
  const [serverConnectionError, setServerConnectionError] = useState<string | null>(null);
  const [isNexusGoldOpen, setIsNexusGoldOpen] = useState(false);
  const [isMatchCodeModalOpen, setIsMatchCodeModalOpen] = useState(false);
  const [selectedRealm, setSelectedRealm] = useState<string | null>(null);
  const [matchCode, setMatchCode] = useState('');
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'security' | 'payment' | 'notifications' | 'account'>('profile');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const [servers] = useState<Server[]>([
    { id: '1', name: 'NEXUS SURVIVAL #1', type: 'Minecraft', category: 'Survival', players: 1842, maxPlayers: 2000, ping: 24, status: 'online', region: 'US-EAST' },
    { id: '2', name: 'NEXUS CREATIVE #2', type: 'Minecraft', category: 'Creative', players: 956, maxPlayers: 1000, ping: 32, status: 'online', region: 'EU-WEST' },
    { id: '3', name: 'NEXUS HARDCORE #3', type: 'Minecraft', category: 'Survival', players: 12, maxPlayers: 50, ping: 112, status: 'maintenance', region: 'ASIA-SOUTH' },
    { id: '4', name: 'VALORANT EU-CENTRAL', type: 'Valorant', players: 10, maxPlayers: 10, ping: 18, status: 'online', region: 'EU-CENTRAL' },
    { id: '5', name: 'RUST PVP MAIN', type: 'Rust', players: 445, maxPlayers: 500, ping: 45, status: 'online', region: 'US-WEST' },
    { id: '6', name: 'CS2 COMPETITIVE #1', type: 'CS2', players: 0, maxPlayers: 10, ping: 0, status: 'offline', region: 'US-EAST' },
    { id: '7', name: 'NEXUS SKYBLOCK #1', type: 'Minecraft', category: 'Skyblock', players: 2204, maxPlayers: 2500, ping: 28, status: 'online', region: 'US-EAST' },
    { id: '8', name: 'GTA V ROLEPLAY #1', type: 'GTA V', players: 124, maxPlayers: 128, ping: 52, status: 'online', region: 'EU-WEST' },
    { id: '8b', name: 'GTA V CHAOS CITY', type: 'GTA V', players: 256, maxPlayers: 500, ping: 48, status: 'online', region: 'US-EAST' },
    { id: '8c', name: 'GTA V RACING WORLD', type: 'GTA V', players: 42, maxPlayers: 100, ping: 65, status: 'online', region: 'ASIA-EAST' },
    { id: '9', name: 'LEAGUE OF LEGENDS EUW', type: 'LoL', players: 10, maxPlayers: 10, ping: 14, status: 'online', region: 'EU-WEST' },
    { id: '10', name: 'NEXUS ANARCHY #1', type: 'Minecraft', category: 'Survival', players: 189, maxPlayers: 200, ping: 65, status: 'online', region: 'US-WEST' },
    { id: '11', name: 'APEX LEGENDS ARENA', type: 'Apex', players: 60, maxPlayers: 60, ping: 22, status: 'online', region: 'ASIA-EAST' },
    { id: '12', name: 'NEXUS PRISON #1', type: 'Minecraft', category: 'Prison', players: 742, maxPlayers: 800, ping: 38, status: 'online', region: 'EU-CENTRAL' },
    { id: '13', name: 'DOTA 2 RANKED', type: 'Dota 2', players: 10, maxPlayers: 10, ping: 19, status: 'online', region: 'EU-EAST' },
    { id: '14', name: 'NEXUS BEDWARS #1', type: 'Minecraft', category: 'Bedwars', players: 567, maxPlayers: 600, ping: 21, status: 'online', region: 'US-EAST' },
    { id: '15', name: 'FORTNITE CUSTOMS', type: 'Fortnite', players: 100, maxPlayers: 100, ping: 12, status: 'online', region: 'US-WEST' },
    { id: '16', name: 'NEXUS FACTIONS #1', type: 'Minecraft', category: 'Factions', players: 1567, maxPlayers: 2000, ping: 31, status: 'online', region: 'US-EAST' },
    { id: '17', name: 'WARZONE 2.0 BR', type: 'Warzone', players: 150, maxPlayers: 150, ping: 25, status: 'online', region: 'EU-WEST' },
    { id: '17b', name: 'COD: MODERN WARFARE III', type: 'COD', players: 12, maxPlayers: 12, ping: 18, status: 'online', region: 'US-EAST' },
    { id: '17c', name: 'COD: BLACK OPS COLD WAR', type: 'COD', players: 10, maxPlayers: 12, ping: 32, status: 'online', region: 'EU-WEST' },
    { id: '17d', name: 'COD: VANGUARD MULTIPLAYER', type: 'COD', players: 14, maxPlayers: 16, ping: 45, status: 'online', region: 'ASIA-SOUTH' },
    { id: '18', name: 'NEXUS MINIGAMES', type: 'Minecraft', category: 'Minigames', players: 3456, maxPlayers: 5000, ping: 18, status: 'online', region: 'US-EAST' },
    { id: '19', name: 'RAINBOW SIX SIEGE', type: 'R6', players: 10, maxPlayers: 10, ping: 20, status: 'online', region: 'EU-CENTRAL' },
    { id: '20', name: 'NEXUS CREATIVE #3', type: 'Minecraft', category: 'Creative', players: 890, maxPlayers: 1000, ping: 35, status: 'online', region: 'ASIA-EAST' },
    { id: '21', name: 'NEXUS BEDWARS PRO', type: 'Minecraft', category: 'Bedwars', players: 450, maxPlayers: 1000, ping: 12, status: 'online', region: 'GLOBAL' },
    { id: '22', name: 'SKYGRID SURVIVAL', type: 'Minecraft', category: 'Survival', players: 120, maxPlayers: 300, ping: 35, status: 'online', region: 'US-EAST' },
    { id: '23', name: 'NEXUS UHC RUN', type: 'Minecraft', category: 'Minigames', players: 100, maxPlayers: 100, ping: 15, status: 'online', region: 'GLOBAL' },
    { id: '24', name: 'THE BRIDGES', type: 'Minecraft', category: 'Minigames', players: 320, maxPlayers: 600, ping: 22, status: 'online', region: 'EU-WEST' },
    { id: '25', name: 'NEXUS WALLS', type: 'Minecraft', category: 'Minigames', players: 180, maxPlayers: 400, ping: 25, status: 'online', region: 'US-CENTRAL' },
    { id: '26', name: 'SURVIVAL GAMES', type: 'Minecraft', category: 'Survival', players: 600, maxPlayers: 1200, ping: 18, status: 'online', region: 'GLOBAL' },
    { id: '27', name: 'CREATIVE PLUS', type: 'Minecraft', category: 'Creative', players: 240, maxPlayers: 500, ping: 42, status: 'online', region: 'US-WEST' },
    { id: '28', name: 'HARDCORE PLUS', type: 'Minecraft', category: 'Survival', players: 45, maxPlayers: 100, ping: 50, status: 'online', region: 'EU-NORTH' },
    { id: '29', name: 'FACTIONS PLUS', type: 'Minecraft', category: 'Factions', players: 750, maxPlayers: 1500, ping: 28, status: 'online', region: 'US-EAST' },
    { id: '30', name: 'SKYBLOCK PLUS', type: 'Minecraft', category: 'Skyblock', players: 1800, maxPlayers: 3000, ping: 20, status: 'online', region: 'GLOBAL' },
    { id: '31', name: 'PRISON PLUS', type: 'Minecraft', category: 'Prison', players: 540, maxPlayers: 1000, ping: 45, status: 'online', region: 'EU-CENTRAL' },
    { id: '32', name: 'ANARCHY PLUS', type: 'Minecraft', category: 'Survival', players: 120, maxPlayers: 300, ping: 68, status: 'online', region: 'US-EAST' },
    { id: '33', name: 'ROLEPLAY PLUS', type: 'Minecraft', category: 'RP', players: 890, maxPlayers: 1500, ping: 38, status: 'online', region: 'US-WEST' },
    { id: '34', name: 'VANILLA PLUS', type: 'Minecraft', category: 'Vanilla', players: 310, maxPlayers: 600, ping: 25, status: 'online', region: 'EU-WEST' },
    { id: '35', name: 'PVP PLUS', type: 'Minecraft', category: 'PvP', players: 1200, maxPlayers: 2000, ping: 12, status: 'online', region: 'GLOBAL' },
    { id: '36', name: 'RPG PLUS', type: 'Minecraft', category: 'RPG', players: 1500, maxPlayers: 3000, ping: 30, status: 'online', region: 'EU-NORTH' },
    { id: '37', name: 'LIFESTEAL PLUS', type: 'Minecraft', category: 'Survival', players: 600, maxPlayers: 1200, ping: 42, status: 'online', region: 'US-CENTRAL' },
    { id: '38', name: 'ONEBLOCK PLUS', type: 'Minecraft', category: 'Skyblock', players: 1100, maxPlayers: 2000, ping: 45, status: 'online', region: 'EU-WEST' },
    { id: '39', name: 'PARKOUR PLUS', type: 'Minecraft', category: 'Minigames', players: 450, maxPlayers: 1000, ping: 22, status: 'online', region: 'US-EAST' },
    { id: '40', name: 'ZOMBIE PLUS', type: 'Minecraft', category: 'Survival', players: 540, maxPlayers: 1000, ping: 55, status: 'online', region: 'EU-CENTRAL' },
    { id: '41', name: 'EARTH PLUS', type: 'Minecraft', category: 'Survival', players: 2800, maxPlayers: 5000, ping: 35, status: 'online', region: 'GLOBAL' },
    { id: '42', name: 'KITPVP PLUS', type: 'Minecraft', category: 'PvP', players: 800, maxPlayers: 1500, ping: 15, status: 'online', region: 'GLOBAL' },
    { id: '43', name: 'CYBERPUNK PLUS', type: 'Minecraft', category: 'RP', players: 320, maxPlayers: 600, ping: 40, status: 'online', region: 'US-EAST' },
    { id: '44', name: 'MEDIEVAL PLUS', type: 'Minecraft', category: 'RPG', players: 750, maxPlayers: 1200, ping: 48, status: 'online', region: 'EU-WEST' },
    { id: '45', name: 'NEXUS GOLD EXCLUSIVE', type: 'Minecraft', category: 'Survival', players: 100, maxPlayers: 1000, ping: 5, status: 'online', region: 'GLOBAL' },
    { id: '46', name: 'SKYGRID PRO', type: 'Minecraft', category: 'Survival', players: 150, maxPlayers: 300, ping: 32, status: 'online', region: 'US-EAST' },
    { id: '47', name: 'UHC RUN PRO', type: 'Minecraft', category: 'Minigames', players: 120, maxPlayers: 120, ping: 18, status: 'online', region: 'GLOBAL' },
    { id: '48', name: 'BRIDGES PRO', type: 'Minecraft', category: 'Minigames', players: 400, maxPlayers: 800, ping: 25, status: 'online', region: 'EU-WEST' },
    { id: '49', name: 'WALLS PRO', type: 'Minecraft', category: 'Minigames', players: 250, maxPlayers: 500, ping: 28, status: 'online', region: 'US-CENTRAL' },
    { id: '50', name: 'SURVIVAL GAMES PRO', type: 'Minecraft', category: 'Survival', players: 800, maxPlayers: 1500, ping: 20, status: 'online', region: 'GLOBAL' },
    { id: '51', name: 'CREATIVE PRO', type: 'Minecraft', category: 'Creative', players: 300, maxPlayers: 600, ping: 45, status: 'online', region: 'US-WEST' },
    { id: '52', name: 'HARDCORE PRO', type: 'Minecraft', category: 'Survival', players: 60, maxPlayers: 120, ping: 55, status: 'online', region: 'EU-NORTH' },
    { id: '53', name: 'FACTIONS PRO', type: 'Minecraft', category: 'Factions', players: 1000, maxPlayers: 2000, ping: 30, status: 'online', region: 'US-EAST' },
    { id: '54', name: 'SKYBLOCK PRO', type: 'Minecraft', category: 'Skyblock', players: 2000, maxPlayers: 4000, ping: 22, status: 'online', region: 'GLOBAL' },
    { id: '55', name: 'PRISON PRO', type: 'Minecraft', category: 'Prison', players: 700, maxPlayers: 1200, ping: 48, status: 'online', region: 'EU-CENTRAL' },
    { id: '56', name: 'ANARCHY PRO', type: 'Minecraft', category: 'Survival', players: 200, maxPlayers: 400, ping: 70, status: 'online', region: 'US-EAST' },
    { id: '57', name: 'ROLEPLAY PRO', type: 'Minecraft', category: 'RP', players: 1200, maxPlayers: 2000, ping: 42, status: 'online', region: 'US-WEST' },
    { id: '58', name: 'VANILLA PRO', type: 'Minecraft', category: 'Vanilla', players: 400, maxPlayers: 800, ping: 28, status: 'online', region: 'EU-WEST' },
    { id: '59', name: 'PVP PRO', type: 'Minecraft', category: 'PvP', players: 1500, maxPlayers: 2500, ping: 15, status: 'online', region: 'GLOBAL' },
    { id: '60', name: 'RPG PRO', type: 'Minecraft', category: 'RPG', players: 2000, maxPlayers: 4000, ping: 28, status: 'online', region: 'EU-NORTH' },
    { id: '61', name: 'LIFESTEAL PRO', type: 'Minecraft', category: 'Survival', players: 800, maxPlayers: 1500, ping: 40, status: 'online', region: 'US-CENTRAL' },
    { id: '62', name: 'ONEBLOCK PRO', type: 'Minecraft', category: 'Skyblock', players: 1500, maxPlayers: 2500, ping: 48, status: 'online', region: 'EU-WEST' },
    { id: '63', name: 'PARKOUR PRO', type: 'Minecraft', category: 'Minigames', players: 600, maxPlayers: 1200, ping: 25, status: 'online', region: 'US-EAST' },
    { id: '64', name: 'ZOMBIE PRO', type: 'Minecraft', category: 'Survival', players: 700, maxPlayers: 1200, ping: 58, status: 'online', region: 'EU-CENTRAL' },
    { id: '65', name: 'EARTH PRO', type: 'Minecraft', category: 'Survival', players: 3500, maxPlayers: 6000, ping: 38, status: 'online', region: 'GLOBAL' },
    { id: '66', name: 'KITPVP PRO', type: 'Minecraft', category: 'PvP', players: 1000, maxPlayers: 2000, ping: 18, status: 'online', region: 'GLOBAL' },
    { id: '67', name: 'CYBERPUNK PRO', type: 'Minecraft', category: 'RP', players: 400, maxPlayers: 800, ping: 42, status: 'online', region: 'US-EAST' },
    { id: '68', name: 'MEDIEVAL PRO', type: 'Minecraft', category: 'RPG', players: 1000, maxPlayers: 1500, ping: 50, status: 'online', region: 'EU-WEST' },
    { id: '69', name: 'BATTLE ROYALE PRO', type: 'Minecraft', category: 'PvP', players: 300, maxPlayers: 300, ping: 18, status: 'online', region: 'GLOBAL' },
    { id: '70', name: 'SPACE PRO', type: 'Minecraft', category: 'Survival', players: 700, maxPlayers: 1200, ping: 60, status: 'online', region: 'ASIA-EAST' },
  ]);

  const filteredServers = servers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(serverSearch.toLowerCase()) || s.type.toLowerCase().includes(serverSearch.toLowerCase());
    const matchesFilter = serverFilter === 'ALL' || s.status.toUpperCase() === serverFilter;
    const matchesType = serverTypeFilter === 'ALL' || s.category === serverTypeFilter;
    const matchesRegion = regionFilter === 'ALL' || s.region === regionFilter;
    return matchesSearch && matchesFilter && matchesType && matchesRegion;
  });

  const handleJoinServer = (serverName: string) => {
    setIsConnectingToServer(true);
    setServerConnectionError(null);
    
    setTimeout(() => {
      setIsConnectingToServer(false);
      setServerConnectionError("can’t connect to the server check your internet connection and retry");
    }, 5000);
  };

  const handleLogout = async () => {
    try {
      if (userData.isGuest) {
        setIsLoggedIn(false);
        setUserData(prev => ({ ...prev, isGuest: false, name: 'Nexus_Warrior' }));
      } else {
        await auth.signOut();
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    { user: 'Nexus_Mod', msg: 'Welcome to the Nexus Hub! Keep it professional and have fun.', time: '10:00 AM', isMod: true, avatar: 'https://picsum.photos/seed/mod/100/100' },
    { user: 'GamerX', msg: 'Anyone up for some Minecraft survival?', time: '10:05 AM', avatar: 'https://picsum.photos/seed/gamer/100/100' },
    { user: 'ProBuilder', msg: 'I just finished the new spawn area on Server #2!', time: '10:07 AM', avatar: 'https://picsum.photos/seed/builder/100/100' },
    { user: 'Shadow', msg: 'Looking for a Valorant duo, Plat rank.', time: '10:10 AM', avatar: 'https://picsum.photos/seed/shadow/100/100' },
    { user: 'Alice', msg: 'The new update is insane!', time: '10:12 AM', avatar: 'https://picsum.photos/seed/alice/100/100' },
    { user: 'Cyber_Ghost', msg: 'Hello everyone! I am here to help with any questions about Nexus Hub. Feel free to ask!', time: '10:15 AM', isAI: true, avatar: 'https://picsum.photos/seed/ai/100/100' },
    { user: 'DragonSlayer', msg: 'How do I join the tournament?', time: '10:16 AM', avatar: 'https://picsum.photos/seed/dragon/100/100' },
    { user: 'Nexus_AI', msg: 'You can join the tournament by going to the Games section and selecting the Tournament Arena server. Make sure you have a Prime membership!', time: '10:17 AM', isAI: true, isMentioned: true, avatar: 'https://picsum.photos/seed/ai2/100/100' },
  ]);
  const [userData, setUserData] = useState({
    uid: '',
    name: 'Nexus_Warrior',
    role: 'member' as UserRole,
    email: '',
    phone: '',
    idCard: '',
    passport: '',
    backupPassword: '',
    savedCard: '',
    avatar: '',
    level: 1,
    xp: 0,
    maxXp: 1000,
    ranking: 0,
    gameHours: 0,
    country: '',
    bio: '',
    preferredGames: [] as string[],
    socialLinks: {
      twitter: '',
      discord: '',
      twitch: ''
    },
    isGuest: false,
    recentActivity: [] as Activity[],
    friends: [] as Friend[],
    friendRequests: [] as Friend[],
    notifications: [] as Notification[],
    verification: {
      type: 'NID' as 'NID' | 'Passport' | 'Driving License',
      number: '',
      image: null as string | null,
      status: 'unverified' as 'unverified' | 'pending' | 'verified',
      country: ''
    },
    createdAt: null as Timestamp | null,
    lastLogin: null as Timestamp | null
  });

  // Admin Action Logging
  const logAdminAction = async (targetId: string, targetName: string, action: string, details: string) => {
    if (!currentUser || (userData.role !== 'admin' && userData.role !== 'moderator')) return;
    
    try {
      await addDoc(collection(db, 'admin_logs'), {
        adminId: currentUser.uid,
        adminName: userData.name,
        targetId,
        targetName,
        action,
        details,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'admin_logs');
    }
  };

  // User Progression & Online Count Simulation
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    // Gradually increase game hours and ranking
    const progressionInterval = setInterval(async () => {
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        await updateDoc(userDocRef, {
          gameHours: increment(0.1),
          ranking: increment(1),
          xp: increment(5)
        });
      } catch (error) {
        // Silent fail for background progression
      }
    }, 60000); // Every minute

    return () => clearInterval(progressionInterval);
  }, [isLoggedIn, currentUser]);

  // Online Count Simulation (Passage of time)
  const [simulatedOnlineCount, setSimulatedOnlineCount] = useState(1204);
  
  // Simulate other users typing in global chat
  useEffect(() => {
    if (!isLoggedIn || currentView !== 'chat') return;

    const simulateTyping = () => {
      const shouldType = Math.random() > 0.7;
      if (shouldType && !isAiTyping) {
        const users = [
          { name: 'GamerX', avatar: 'https://picsum.photos/seed/gamer/100/100' },
          { name: 'ProBuilder', avatar: 'https://picsum.photos/seed/builder/100/100' },
          { name: 'Shadow', avatar: 'https://picsum.photos/seed/shadow/100/100' },
          { name: 'Alice', avatar: 'https://picsum.photos/seed/alice/100/100' }
        ];
        const randomUser = users[Math.floor(Math.random() * users.length)];
        setTypingUser(randomUser);
        setIsAiTyping(true);
        
        setTimeout(() => {
          setIsAiTyping(false);
          setTypingUser(null);
        }, 3000 + Math.random() * 4000);
      }
    };

    const interval = setInterval(simulateTyping, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn, currentView, isAiTyping]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedOnlineCount(prev => {
        const change = Math.floor(Math.random() * 11) - 5; // -5 to +5
        return Math.max(100, prev + change);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // Reset guest status when a real user is detected
          setUserData(prev => ({ ...prev, isGuest: false }));
          setCurrentUser(user);
          setIsLoggedIn(true);
          
          // Check if user exists in Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            // Create new user profile
            const newUser = {
              uid: user.uid,
              name: user.displayName || 'Nexus_Warrior',
              email: user.email || '',
              role: 'member' as UserRole,
              avatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`,
              level: 1,
              xp: 0,
              maxXp: 1000,
              ranking: 0,
              gameHours: 0,
              country: '',
              bio: 'New warrior in the Nexus.',
              preferredGames: [],
              socialLinks: { twitter: '', discord: '', twitch: '' },
              verification: { type: 'NID', number: '', image: null, status: 'unverified', country: '' },
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
              isOnline: true
            };
            await setDoc(userDocRef, newUser);
          } else {
            // Update last login and online status
            await updateDoc(userDocRef, {
              lastLogin: serverTimestamp(),
              isOnline: true
            });
          }

          // Handle tab close/disconnect
          const handleDisconnect = () => {
            updateDoc(userDocRef, { isOnline: false });
          };
          window.addEventListener('beforeunload', handleDisconnect);
        } else {
          setCurrentUser(null);
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Data Sync
  useEffect(() => {
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserData(prev => ({ ...prev, ...doc.data() }));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`));

    const friendsColRef = collection(db, 'users', currentUser.uid, 'friends');
    const unsubFriends = onSnapshot(friendsColRef, (snapshot) => {
      const friendsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Friend));
      setUserData(prev => ({ ...prev, friends: friendsList }));
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/friends`));

    const notificationsColRef = collection(db, 'users', currentUser.uid, 'notifications');
    const unsubNotifications = onSnapshot(notificationsColRef, (snapshot) => {
      const notificationsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setUserData(prev => ({ ...prev, notifications: notificationsList }));
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/notifications`));

    const messagesQuery = query(collection(db, 'messages'), orderBy('timestamp', 'asc'), limit(50));
    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({ ...doc.data() } as Message));
      if (messagesList.length > 0) {
        setMessages(messagesList);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'messages'));

    // Global Activities Listener
    const activitiesQuery = query(collection(db, 'activities'), orderBy('createdAt', 'desc'), limit(10));
    const unsubActivities = onSnapshot(activitiesQuery, (snapshot) => {
      const activitiesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
      setActivities(activitiesList);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'activities'));

    // Users Status Listener (for friends)
    const unsubUsersStatus = onSnapshot(collection(db, 'users'), (snapshot) => {
      const statusMap: Record<string, boolean> = {};
      snapshot.docs.forEach(doc => {
        statusMap[doc.id] = doc.data().isOnline || false;
      });
      setUsersStatus(statusMap);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    return () => {
      unsubUser();
      unsubFriends();
      unsubNotifications();
      unsubMessages();
      unsubActivities();
      unsubUsersStatus();
    };
  }, [currentUser]);

  // --- New Feature States ---
  const [activities, setActivities] = useState<Activity[]>([]);
  const [globalChatSearch, setGlobalChatSearch] = useState('');
  const [activePrivateChat, setActivePrivateChat] = useState<Friend | null>(null);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [privateChatInput, setPrivateChatInput] = useState('');
  const [usersStatus, setUsersStatus] = useState<Record<string, boolean>>({});

  // Private Chat Listener
  useEffect(() => {
    if (!currentUser || !activePrivateChat) {
      setPrivateMessages([]);
      return;
    }

    const chatId = [currentUser.uid, activePrivateChat.id].sort().join('_');
    const privateMessagesQuery = query(
      collection(db, 'private_chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubPrivateMessages = onSnapshot(privateMessagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrivateMessage));
      setPrivateMessages(msgs);
    }, (error) => handleFirestoreError(error, OperationType.GET, `private_chats/${chatId}/messages`));

    return () => unsubPrivateMessages();
  }, [currentUser, activePrivateChat]);

  const saveUserData = async (newData: any) => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      // Filter out local-only state if any
      const { friends, friendRequests, notifications, ...toSave } = newData;
      await updateDoc(userDocRef, toSave);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const [suggestedFriends] = useState<Friend[]>([
    { id: '4', name: 'Void_Walker', avatar: 'https://picsum.photos/seed/void/100/100', status: 'online', bio: 'Exploring the digital void.' },
    { id: '5', name: 'Alpha_Striker', avatar: 'https://picsum.photos/seed/alpha/100/100', status: 'offline', bio: 'Competitive FPS player.' },
    { id: '6', name: 'Neon_Knight', avatar: 'https://picsum.photos/seed/neon/100/100', status: 'online', bio: 'Retro gaming enthusiast.' }
  ]);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);


  useEffect(() => {
    if (!showDashboard && currentView === 'dashboard') {
      setCurrentView('games');
    }
  }, [showDashboard, currentView]);

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(null);
  const AI_NAMES = ['Nexus_Warrior', 'Cyber_Ghost', 'Elite_Gamer', 'Shadow_Hunter', 'Pixel_Master', 'Void_Walker', 'Neon_Knight', 'Alpha_Striker'];

  const handleSendPrivateMessage = async () => {
    if (!privateChatInput.trim() || !currentUser || !activePrivateChat) return;

    const chatId = [currentUser.uid, activePrivateChat.id].sort().join('_');
    const newMessage = {
      senderId: currentUser.uid,
      senderName: userData.name,
      text: privateChatInput,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'private_chats', chatId, 'messages'), newMessage);
      setPrivateChatInput('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `private_chats/${chatId}/messages`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userData.isGuest) {
      setIsLoginRequiredOpen(true);
      return;
    }
    if (!chatInput.trim() || !currentUser) return;

    const isMentioned = chatInput.toLowerCase().includes('nexus ai');

    const userMsg: Message = {
      user: userData.name,
      msg: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: userData.avatar || undefined,
      timestamp: serverTimestamp() as any
    };

    try {
      await addDoc(collection(db, 'messages'), userMsg);
      setChatInput('');

      // Add to global activity
      await addDoc(collection(db, 'activities'), {
        userId: currentUser.uid,
        userName: userData.name,
        userAvatar: userData.avatar,
        type: 'social',
        text: `${userData.name} sent a message in global chat`,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }

    // AI Response Logic
    setIsAiTyping(true);
    
    // Select AI name early to show in typing indicator
    const aiName = isMentioned ? 'Nexus_AI' : AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
    const aiAvatar = `https://picsum.photos/seed/${aiName}/100/100`;
    setTypingUser({ name: aiName, avatar: aiAvatar });

    // Random delay between 3-8 seconds for a more natural feel
    const delay = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;

    setTimeout(async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: chatInput,
          config: {
            systemInstruction: `You are ${aiName}, a highly active and respected member of the Nexus Hub gaming community. 
            Your personality:
            - Enthusiastic about all things gaming (PC, Console, Mobile).
            - Knowledgeable about current trends, esports, and hardware.
            - Human-like: Use occasional gaming slang (gg, glhf, pwned, meta, etc.), but don't overdo it.
            - Concise: Keep responses under 3 sentences unless explaining something complex.
            - Engaging: Ask follow-up questions or share your own "experience" in games.
            ${isMentioned ? 'The user specifically mentioned Nexus AI, so you should acknowledge your role as the Nexus AI assistant, but still maintain a friendly, community-focused vibe.' : 'You are responding as a regular community member. Never mention you are an AI or a bot. Act like you just finished a long gaming session.'}`,
          },
        });

        const aiMsg: Message = {
          user: aiName,
          msg: response.text || "GG, my connection lagged out. What were we saying?",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAI: true,
          isMentioned: isMentioned,
          avatar: aiAvatar,
          timestamp: serverTimestamp() as any
        };

        await addDoc(collection(db, 'messages'), aiMsg);
      } catch (error) {
        console.error("AI Error:", error);
      } finally {
        setIsAiTyping(false);
        setTypingUser(null);
      }
    }, delay);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newAvatar = reader.result as string;
        setUserData({ ...userData, avatar: newAvatar });
        saveUserData({ avatar: newAvatar });
      };
      reader.readAsDataURL(file);
    }
  };

  const addFriend = async (friend: Friend) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'users', currentUser.uid, 'friends'), {
        ...friend,
        timestamp: serverTimestamp()
      });
      
      // Add to global activity
      await addDoc(collection(db, 'activities'), {
        userId: currentUser.uid,
        userName: userData.name,
        userAvatar: userData.avatar,
        type: 'social',
        text: `${userData.name} became friends with ${friend.name}`,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${currentUser.uid}/friends`);
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!currentUser) return;
    try {
      // Find the friend doc by its original friend ID
      const q = query(collection(db, 'users', currentUser.uid, 'friends'), where('id', '==', friendId));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${currentUser.uid}/friends`);
    }
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  if (loading) {
    return (
      <div className="min-h-screen bg-nexus-dark flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-12 h-12 bg-nexus-accent rounded-xl flex items-center justify-center"
        >
          <Zap size={24} className="text-white fill-current" />
        </motion.div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <ErrorBoundary>
        <LoginScreen 
          onLogin={(isGuest) => {
            setIsNexusGoldOpen(false); // Ensure modal is closed on login
            if (isGuest) {
              setUserData(prev => ({ 
                ...prev, 
                isGuest: true, 
                name: `Guest_${Math.floor(Math.random() * 9000) + 1000}`,
                role: 'member' as UserRole,
                avatar: `https://picsum.photos/seed/guest/100/100`
              }));
              setIsLoggedIn(true);
            } else {
              setIsLoggedIn(true);
            }
          }} 
          onNexusGold={() => setIsNexusGoldOpen(true)}
        />
        <NexusGoldModal 
          isOpen={isNexusGoldOpen} 
          onClose={() => setIsNexusGoldOpen(false)} 
          onActivate={(key) => {
            setUserData(prev => ({ ...prev, role: 'gold' }));
            setIsNexusGoldOpen(false);
            setIsLoggedIn(true); // Log in if key is valid
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`flex flex-col min-h-screen bg-nexus-dark text-nexus-text font-sans selection:bg-nexus-accent selection:text-white overflow-x-hidden ${theme}`}>
      <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />
      <ServersModal 
        isOpen={isServersOpen} 
        onClose={() => setIsServersOpen(false)} 
        onJoinServer={handleJoinServer}
      />
      <ConnectingModal 
        isOpen={isConnectingToServer} 
        error={serverConnectionError} 
        onClose={() => {
          setIsConnectingToServer(false);
          setServerConnectionError(null);
        }} 
      />
      <NexusGoldModal 
        isOpen={isNexusGoldOpen} 
        onClose={() => setIsNexusGoldOpen(false)} 
        onActivate={(key) => {
          setUserData(prev => ({ ...prev, role: 'gold' }));
          setIsNexusGoldOpen(false);
        }}
      />
      
      {/* Login Required Modal */}
      <AnimatePresence>
        {isLoginRequiredOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginRequiredOpen(false)}
              className="absolute inset-0 bg-nexus-dark/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md glass-panel rounded-[2.5rem] p-10 relative z-10 border-white/10 text-center shadow-2xl"
            >
              <div className="w-24 h-24 bg-nexus-accent/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Lock size={48} className="text-nexus-accent highlight-icon" />
              </div>
              <h2 className="text-3xl font-black tracking-tighter text-nexus-text uppercase mb-3 highlight-text italic">ACCESS RESTRICTED</h2>
              <p className="text-nexus-muted text-sm mb-10 leading-relaxed font-medium">You are currently browsing as a guest. Please sign up or log in to access chat, payments, and premium features.</p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => {
                    setIsLoginRequiredOpen(false);
                    setIsLoggedIn(false); // This will trigger the LoginScreen
                  }}
                  className="w-full bg-nexus-accent text-white font-black py-5 rounded-2xl shadow-xl shadow-nexus-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-xs highlight-text"
                >
                  Sign Up / Login
                </button>
                <button 
                  onClick={() => setIsLoginRequiredOpen(false)}
                  className="w-full bg-white/5 text-nexus-dim font-black py-5 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-xs"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <RolePasswordModal 
        isOpen={isRoleModalOpen} 
        onClose={() => setIsRoleModalOpen(false)} 
        role={pendingRole}
        onConfirm={() => {
          if (pendingRole) {
            setUserData({ ...userData, role: pendingRole });
            setIsRoleModalOpen(false);
            setPendingRole(null);
          }
        }}
      />
      
      {/* Header */}
      <header className="h-16 md:h-20 border-b border-nexus-border flex items-center justify-between px-4 md:px-6 lg:px-8 glass-panel sticky top-0 z-50 w-full">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-nexus-accent rounded-xl flex items-center justify-center shadow-lg shadow-nexus-accent/20 group cursor-pointer" onClick={() => setCurrentView('dashboard')}>
              <Zap size={24} className="text-white highlight-icon group-hover:scale-110 transition-transform" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tighter text-nexus-text uppercase leading-none highlight-text">NEXUS HUB</h1>
                <Tooltip content="NEXUS+ Premium Member" position="bottom">
                  <div className="nexus-plus-badge cursor-help hover:scale-105 transition-transform">
                    <Star size={8} className="fill-current" />
                    <span>PLUS</span>
                  </div>
                </Tooltip>
              </div>
              <p className="text-[10px] font-black text-nexus-accent tracking-[0.2em] uppercase opacity-80">Premium Gaming</p>
            </div>
          </div>
          
          <div className="h-8 w-px bg-nexus-border mx-2 hidden md:block" />
          
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5 shadow-inner">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[10px] font-black text-nexus-text uppercase tracking-widest">{simulatedOnlineCount} ONLINE</span>
            </div>
            
            <button 
              onClick={() => {
                if (userData.isGuest) {
                  setIsLoginRequiredOpen(true);
                } else {
                  setIsPaymentOpen(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-1.5 bg-nexus-accent/10 hover:bg-nexus-accent/20 border border-nexus-accent/30 rounded-full transition-all group shadow-sm"
            >
              <Crown size={14} className="text-nexus-accent group-hover:scale-110 transition-transform highlight-icon" />
              <span className="text-[10px] font-black text-nexus-accent uppercase tracking-widest highlight-text">NEXUS+</span>
            </button>

            <div className="hidden xl:flex items-center gap-3 px-4 py-1.5 bg-white/5 rounded-full border border-white/5 shadow-inner">
              <span className="text-[8px] font-black text-nexus-dim uppercase tracking-widest">PAYMENT:</span>
              <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
                <Tooltip content="bKash Supported" position="bottom">
                  <div className="flex items-center gap-1 grayscale hover:grayscale-0 transition-all cursor-help">
                    <div className="w-4 h-4 bg-[#D12053] rounded-sm flex items-center justify-center">
                      <span className="text-white text-[6px] font-black">b</span>
                    </div>
                    <span className="text-[7px] font-black text-nexus-dim uppercase">bKash</span>
                  </div>
                </Tooltip>
                <Tooltip content="Nagad Supported" position="bottom">
                  <div className="flex items-center gap-1 grayscale hover:grayscale-0 transition-all cursor-help">
                    <div className="w-4 h-4 bg-[#F7941D] rounded-sm flex items-center justify-center">
                      <span className="text-white text-[6px] font-black">N</span>
                    </div>
                    <span className="text-[7px] font-black text-nexus-dim uppercase">Nagad</span>
                  </div>
                </Tooltip>
                <Tooltip content="Card Payments Supported" position="bottom">
                  <div className="flex items-center gap-1 grayscale hover:grayscale-0 transition-all cursor-help">
                    <CreditCard size={10} className="text-nexus-dim" />
                    <span className="text-[7px] font-black text-nexus-dim uppercase">Card</span>
                  </div>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-6 lg:gap-8">
          <div className="flex items-center gap-2 group cursor-pointer shrink-0">
            <div className="p-1.5 bg-nexus-accent rounded-lg shadow-lg shadow-nexus-accent/20 group-hover:scale-110 transition-transform">
              <Zap size={18} className="text-white fill-current highlight-icon" />
            </div>
            <span className="font-black text-lg md:text-xl tracking-tighter nexus-gradient-text hidden sm:block">NEXUS</span>
          </div>

            <nav className="flex items-center gap-1 md:gap-2">
            {(userData.role === 'admin' || userData.role === 'moderator') && showDashboard && (
              <NavButton 
                icon={LayoutDashboard} 
                label="Dashboard" 
                tooltip="Overview of your gaming stats and activities"
                active={currentView === 'dashboard'} 
                onClick={() => setCurrentView('dashboard')} 
              />
            )}
            <NavButton 
              icon={Gamepad2} 
              label="Games" 
              tooltip="Explore and launch your favorite games"
              active={currentView === 'games'} 
              onClick={() => setCurrentView('games')} 
            />
            <NavButton 
              icon={Globe} 
              label="Servers" 
              tooltip="Browse available game servers"
              active={currentView === 'servers'} 
              onClick={() => setCurrentView('servers')} 
            />
            <NavButton 
              icon={MessageSquare} 
              label="Chat" 
              tooltip="Connect with the global Nexus community"
              active={currentView === 'chat'} 
              onClick={() => {
                if (userData.isGuest) {
                  setIsLoginRequiredOpen(true);
                } else {
                  setCurrentView('chat');
                }
              }} 
            />
            <NavButton 
              icon={Users} 
              label="Friends" 
              tooltip="Manage your squad and alliances"
              active={currentView === 'friends'} 
              onClick={() => setCurrentView('friends')} 
            />
            {userData.role === 'admin' && (
              <NavButton 
                icon={Shield} 
                label="Admin" 
                tooltip="Nexus administrative control center"
                active={currentView === 'admin'} 
                onClick={() => setCurrentView('admin')} 
              />
            )}
            <NavButton 
              icon={Settings} 
              label="Settings" 
              tooltip="Customize your Nexus experience"
              active={currentView === 'settings'} 
              onClick={() => setCurrentView('settings')} 
            />
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Tooltip content="Search for games, players, or servers" position="bottom">
            <div className="relative hidden lg:block w-40 xl:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-dim" size={12} />
              <input 
                type="text" 
                placeholder="Search..."
                className="w-full bg-white/5 border border-nexus-border rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-nexus-gold/30 transition-all text-nexus-text placeholder:text-nexus-dim"
              />
            </div>
          </Tooltip>
          
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex flex-col items-end mr-2">
              <div className="flex items-center gap-2">
                {userData.isGuest && (
                  <span className="text-[8px] bg-white/10 text-nexus-dim px-1.5 py-0.5 rounded border border-white/5 font-black tracking-widest uppercase">Guest</span>
                )}
                <span className="text-[10px] font-black text-nexus-text uppercase tracking-tighter">{userData.name}</span>
              </div>
              <RoleBadge role={userData.role} />
            </div>
            <div className="w-10 h-10 rounded-xl border border-nexus-border overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
              {userData.avatar ? (
                <img src={userData.avatar || undefined} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Users size={16} className="text-nexus-muted" />
              )}
            </div>
            {userData.role === 'member' && (
              <Tooltip content="Upgrade to Pro for exclusive perks" position="bottom">
                <button 
                  onClick={() => setIsPaymentOpen(true)}
                  className="flex items-center gap-2 px-2.5 md:px-4 py-2 bg-nexus-accent/10 border border-nexus-accent/30 rounded-xl text-nexus-accent text-[10px] font-black tracking-widest hover:bg-nexus-accent hover:text-white transition-all shrink-0"
                >
                  <CreditCard size={12} />
                  <span className="hidden md:inline">UPGRADE</span>
                </button>
              </Tooltip>
            )}

            <div className="relative">
              <Tooltip content="System Notifications" position="bottom">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`p-2 transition-colors relative bg-white/5 rounded-xl border shrink-0 ${isNotificationsOpen ? 'text-nexus-accent border-nexus-accent/50' : 'text-nexus-muted hover:text-nexus-text border-nexus-border'}`}
                >
                  <Bell size={16} />
                  {userData.notifications.some(n => !n.isRead) && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-nexus-accent rounded-full border border-nexus-dark" />
                  )}
                </button>
              </Tooltip>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-80 glass-panel border border-nexus-border rounded-2xl shadow-2xl overflow-hidden z-[60]"
                  >
                    <div className="p-4 border-b border-nexus-border flex items-center justify-between bg-white/[0.02]">
                      <h4 className="text-xs font-black text-nexus-text uppercase tracking-widest">Notifications</h4>
                      <button 
                        onClick={() => {
                          setUserData({
                            ...userData,
                            notifications: userData.notifications.map(n => ({ ...n, isRead: true }))
                          });
                        }}
                        className="text-[8px] font-black text-nexus-accent uppercase tracking-widest hover:underline"
                      >
                        Mark all as read
                      </button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {userData.notifications.length > 0 ? (
                        userData.notifications.map((notification) => (
                          <div 
                            key={notification.id} 
                            className={`p-4 border-b border-nexus-border/50 last:border-0 hover:bg-white/[0.03] transition-colors cursor-pointer relative ${!notification.isRead ? 'bg-nexus-accent/5' : ''}`}
                            onClick={() => {
                              setUserData({
                                ...userData,
                                notifications: userData.notifications.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
                              });
                            }}
                          >
                            {!notification.isRead && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-nexus-accent" />
                            )}
                            <div className="flex gap-3">
                              {notification.sender ? (
                                <img src={notification.sender?.avatar || undefined} alt={notification.sender?.name} className="w-8 h-8 rounded-lg object-cover shrink-0" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-nexus-accent/10 flex items-center justify-center shrink-0">
                                  <Zap size={14} className="text-nexus-accent" />
                                </div>
                              )}
                              <div className="space-y-1">
                                <p className="text-[11px] font-black text-nexus-text uppercase tracking-tight leading-none">{notification.title}</p>
                                <p className="text-[10px] text-nexus-muted font-medium leading-relaxed">{notification.message}</p>
                                <p className="text-[8px] font-black text-nexus-dim uppercase tracking-widest">{notification.time}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <p className="text-[10px] font-black text-nexus-dim uppercase tracking-widest">No notifications</p>
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-white/[0.02] text-center border-t border-nexus-border">
                      <button className="text-[9px] font-black text-nexus-muted uppercase tracking-widest hover:text-nexus-accent transition-colors">View all activity</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="h-6 w-[1px] bg-nexus-border mx-1 hidden lg:block" />
            
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className="flex flex-col items-end hidden lg:flex">
                <p className="text-xs font-black tracking-tight text-nexus-text">John Doe</p>
                <div className="flex items-center gap-1">
                  <Shield size={8} className="text-nexus-accent" />
                  <span className="text-[8px] font-black text-nexus-accent tracking-widest uppercase">Prime</span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-red-400 hover:bg-red-400/10 rounded-xl border border-red-400/10 transition-all"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
              {currentView === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-8 md:space-y-12"
                >
                  {/* Hero Section */}
                  <div className="relative h-[280px] md:h-[380px] rounded-[2.5rem] overflow-hidden group shadow-2xl shadow-nexus-accent/5 border border-nexus-border">
                    <img 
                      src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2000" 
                      alt="Hero" 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-nexus-dark/90 via-nexus-dark/30 to-transparent flex flex-col justify-end p-6 md:p-10">
                      <div className="max-w-2xl space-y-3 md:space-y-5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-nexus-accent/20 border border-nexus-accent/30 rounded-full text-nexus-accent text-[9px] font-black tracking-widest uppercase highlight-text">
                          <Zap size={10} className="fill-current highlight-icon" />
                          Live Event: Nexus Championship
                        </div>
                        <h2 className="text-3xl md:text-6xl font-black tracking-tighter leading-[0.9] text-white uppercase italic highlight-text">
                          UNLEASH YOUR <br />
                          <span className="nexus-gradient-text">LEGACY</span>
                        </h2>
                        <div className="flex flex-wrap gap-4 py-2">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
                            <Users size={14} className="text-nexus-accent" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">1.7M Community Members</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
                            <ActivityIcon size={14} className="text-nexus-secondary" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">1.2M+ Daily Active</span>
                          </div>
                        </div>
                        <p className="text-nexus-muted text-xs md:text-base font-medium max-w-lg leading-relaxed opacity-90">
                          Join the most advanced gaming ecosystem. Connect with warriors, compete in tournaments, and dominate the digital realms.
                        </p>
                        <div className="flex gap-3 pt-2">
                          <button className="bg-nexus-accent text-white font-black px-6 md:px-8 py-3 rounded-xl shadow-xl shadow-nexus-accent/30 hover:scale-105 transition-transform text-[10px] md:text-xs uppercase tracking-widest highlight-text">JOIN REALM</button>
                          <button 
                            onClick={() => setCurrentView('servers')}
                            className="glass-panel text-white font-black px-6 md:px-8 py-3 rounded-xl hover:bg-white/10 transition-colors text-[10px] md:text-xs uppercase tracking-widest border border-white/10 highlight-text"
                          >
                            VIEW SERVERS
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                    {/* Profile Summary */}
                    <div className="lg:col-span-4 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black tracking-tight text-nexus-text uppercase italic highlight-text">WARRIOR PROFILE</h3>
                        <button onClick={() => setCurrentView('settings')} className="text-nexus-accent text-[10px] font-black tracking-widest uppercase hover:underline highlight-text">EDIT</button>
                      </div>
                      <div className="nexus-card p-8 space-y-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-accent/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-nexus-accent/10 transition-colors" />
                        
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 rounded-2xl border-2 border-nexus-accent/30 p-1 relative shadow-lg shadow-nexus-accent/10">
                            <div className="w-full h-full rounded-xl overflow-hidden bg-white/5">
                              {userData.avatar ? (
                                <img src={userData.avatar || undefined} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Users size={32} className="text-nexus-muted m-auto h-full" />
                              )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 border-4 border-nexus-dark rounded-full shadow-lg shadow-green-500/20" />
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-nexus-text uppercase tracking-tight highlight-text">{userData.name}</h4>
                            <RoleBadge role={userData.role} />
                            <div className="flex items-center gap-2 mt-2">
                              <Trophy size={14} className="text-nexus-accent highlight-icon" />
                              <span className="text-[10px] font-black text-nexus-accent uppercase tracking-widest highlight-text">LEVEL {userData.level} • RANK #{userData.ranking.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <p className="text-xs text-nexus-muted leading-relaxed italic opacity-80">
                            "{userData.bio}"
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {userData.preferredGames.map((game, i) => (
                              <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-nexus-dim uppercase tracking-widest highlight-text">
                                {game}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-nexus-border">
                          <div className="text-center">
                            <p className="text-xl font-black text-nexus-text highlight-text">{userData.friends.length}</p>
                            <p className="text-[8px] font-black text-nexus-dim uppercase tracking-widest">Friends</p>
                          </div>
                          <div className="text-center border-x border-nexus-border">
                            <p className="text-xl font-black text-nexus-text highlight-text">152</p>
                            <p className="text-[8px] font-black text-nexus-dim uppercase tracking-widest">Wins</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-black text-nexus-text highlight-text">{Math.floor(userData.gameHours)}h</p>
                            <p className="text-[8px] font-black text-nexus-dim uppercase tracking-widest">Hours</p>
                          </div>
                        </div>

                        <div className="flex gap-4 pt-2">
                          <a href={`https://twitter.com/${userData.socialLinks.twitter}`} target="_blank" rel="noreferrer" className="p-3 bg-white/5 rounded-xl text-nexus-dim hover:text-nexus-accent hover:bg-nexus-accent/10 transition-all border border-transparent hover:border-nexus-accent/20">
                            <Twitter size={18} className="highlight-icon" />
                          </a>
                          <a href={`https://twitch.tv/${userData.socialLinks.twitch}`} target="_blank" rel="noreferrer" className="p-3 bg-white/5 rounded-xl text-nexus-dim hover:text-nexus-accent hover:bg-nexus-accent/10 transition-all border border-transparent hover:border-nexus-accent/20">
                            <Twitch size={18} className="highlight-icon" />
                          </a>
                          <div className="p-3 bg-white/5 rounded-xl text-nexus-dim hover:text-nexus-accent hover:bg-nexus-accent/10 transition-all border border-transparent hover:border-nexus-accent/20 cursor-pointer">
                            <Hash size={18} className="highlight-icon" />
                          </div>
                        </div>
                      </div>

                      {/* Featured Realms moved here for cleaner layout */}
                      <div className="space-y-6 pt-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black tracking-tight text-nexus-text uppercase italic highlight-text">FEATURED REALMS</h3>
                          <button onClick={() => setCurrentView('games')} className="text-nexus-accent text-[10px] font-black tracking-widest uppercase hover:underline flex items-center gap-1 highlight-text">
                            ALL <ChevronRight size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <GameCard 
                            title="Minecraft: Nexus Origin" 
                            players="12.4k" 
                            image="https://images.unsplash.com/photo-1627398242454-45a1465c2479?auto=format&fit=crop&q=80&w=1000" 
                            logo="https://www.minecraft.net/etc.clientlibs/minecraft/clientlibs/main/resources/img/minecraft-logo.png"
                            icon={Sword}
                            requiresMatchCode
                            onClick={() => { setSelectedRealm("Minecraft: Nexus Origin"); setIsMatchCodeModalOpen(true); }}
                          />
                          <GameCard 
                            title="Cyber-Nexus Arena" 
                            players="8.2k" 
                            image="https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&q=80&w=1000" 
                            logo="https://upload.wikimedia.org/wikipedia/commons/e/e4/Cyberpunk_2077_logo.svg"
                            icon={Zap}
                            requiresMatchCode
                            onClick={() => { setSelectedRealm("Cyber-Nexus Arena"); setIsMatchCodeModalOpen(true); }}
                          />
                          <GameCard 
                            title="Nexus: Warzone Elite" 
                            players="15.7k" 
                            image="https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=1000" 
                            logo="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Call_of_Duty_Warzone_logo.svg/1200px-Call_of_Duty_Warzone_logo.svg.png"
                            icon={Target}
                            requiresMatchCode
                            onClick={() => { setSelectedRealm("Nexus: Warzone Elite"); setIsMatchCodeModalOpen(true); }}
                          />
                          <GameCard 
                            title="Nexus: GTA V RP Pro" 
                            players="4.2k" 
                            image="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=1000" 
                            logo="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Grand_Theft_Auto_V_logo.svg/1200px-Grand_Theft_Auto_V_logo.svg.png"
                            icon={Car}
                            requiresMatchCode
                            onClick={() => { setSelectedRealm("Nexus: GTA V RP Pro"); setIsMatchCodeModalOpen(true); }}
                          />
                          <GameCard 
                            title="Nexus: COD Strike" 
                            players="9.1k" 
                            image="https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&q=80&w=1000" 
                            logo="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Call_of_Duty_Warzone_logo.svg/1200px-Call_of_Duty_Warzone_logo.svg.png"
                            icon={Target}
                            requiresMatchCode
                            onClick={() => { setSelectedRealm("Nexus: COD Strike"); setIsMatchCodeModalOpen(true); }}
                          />
                          <GameCard 
                            title="Nexus: Valorant Elite" 
                            players="11.2k" 
                            image="https://images.unsplash.com/photo-1624138784614-87fd1b6528f8?auto=format&fit=crop&q=80&w=1000" 
                            logo="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Valorant_logo_-_pink_color_version.svg/1200px-Valorant_logo_-_pink_color_version.svg.png"
                            icon={Zap}
                            requiresMatchCode
                            onClick={() => { setSelectedRealm("Nexus: Valorant Elite"); setIsMatchCodeModalOpen(true); }}
                          />
                          <GameCard 
                            title="Nexus: CS2 Global" 
                            players="14.5k" 
                            image="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1000" 
                            logo="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Counter-Strike_Global_Offensive_Logo.svg/1200px-Counter-Strike_Global_Offensive_Logo.svg.png"
                            icon={Sword}
                            requiresMatchCode
                            onClick={() => { setSelectedRealm("Nexus: CS2 Global"); setIsMatchCodeModalOpen(true); }}
                          />
                          <GameCard 
                            title="Nexus: Apex Legends Pro" 
                            players="7.8k" 
                            image="https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&q=80&w=1000" 
                            logo="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Apex_Legends_logo.svg/1200px-Apex_Legends_logo.svg.png"
                            icon={Zap}
                            requiresMatchCode
                            onClick={() => { setSelectedRealm("Nexus: Apex Legends Pro"); setIsMatchCodeModalOpen(true); }}
                          />
                          <GameCard 
                            title="Nexus: Rust Survival" 
                            players="5.4k" 
                            image="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1000" 
                            logo="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Rust_logo.svg/1200px-Rust_logo.svg.png"
                            icon={Sword}
                            requiresMatchCode
                            onClick={() => { setSelectedRealm("Nexus: Rust Survival"); setIsMatchCodeModalOpen(true); }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="lg:col-span-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black tracking-tight text-nexus-text uppercase italic highlight-text">RECENT ACTIVITY</h3>
                        <button className="text-nexus-accent text-[10px] font-black tracking-widest uppercase hover:underline highlight-text">VIEW LOGS</button>
                      </div>
                      <div className="nexus-card p-8 space-y-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-nexus-accent/5 via-transparent to-transparent opacity-30 pointer-events-none" />
                        {activities.length > 0 ? activities.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-5 group relative z-10">
                            <div className={`p-4 rounded-2xl flex-shrink-0 border border-transparent group-hover:border-current transition-all shadow-lg ${
                              activity.type === 'achievement' ? 'bg-nexus-accent/10 text-nexus-accent shadow-nexus-accent/5' :
                              activity.type === 'game' ? 'bg-blue-500/10 text-blue-400 shadow-blue-500/5' :
                              activity.type === 'social' ? 'bg-purple-500/10 text-purple-400 shadow-purple-500/5' :
                              'bg-white/5 text-nexus-muted shadow-black/5'
                            }`}>
                              {activity.type === 'achievement' ? <Trophy size={22} className="highlight-icon" /> :
                               activity.type === 'game' ? <Gamepad2 size={22} className="highlight-icon" /> :
                               activity.type === 'social' ? <UserCheck size={22} className="highlight-icon" /> :
                               <ActivityIcon size={22} className="highlight-icon" />}
                            </div>
                            <div className="flex-1 border-b border-nexus-border pb-8 group-last:border-0 group-last:pb-0">
                              <div className="flex justify-between items-start mb-2">
                                <p className="text-nexus-text font-black text-sm md:text-lg uppercase tracking-tight highlight-text group-hover:text-nexus-accent transition-colors">{activity.text}</p>
                                <span className="text-[10px] font-black text-nexus-dim uppercase tracking-widest flex items-center gap-1.5 opacity-80">
                                  <Clock size={12} /> {activity.createdAt?.toDate ? activity.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                                  activity.type === 'achievement' ? 'bg-nexus-accent/5 border-nexus-accent/20 text-nexus-accent' :
                                  activity.type === 'game' ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' :
                                  'bg-white/5 border-white/10 text-nexus-dim'
                                }`}>
                                  {activity.type}
                                </span>
                                <span className="text-[10px] text-nexus-dim uppercase tracking-widest font-black opacity-60">
                                  {activity.userName}
                                </span>
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-10">
                            <p className="text-nexus-dim text-[10px] font-black uppercase tracking-widest opacity-50">No recent activities</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentView === 'friends' && (
                <motion.div 
                  key="friends"
                  initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-10"
                >
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div className="space-y-2">
                      <h2 className="text-4xl md:text-7xl font-black tracking-tighter text-nexus-text uppercase italic leading-none highlight-text">WARRIOR NETWORK</h2>
                      <p className="text-nexus-muted font-medium text-sm md:text-lg max-w-xl">
                        Manage your alliances, discover new warriors, and dominate the realms together.
                      </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="glass-panel px-8 py-4 rounded-3xl flex items-center gap-4 border-white/5 shadow-xl">
                          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/20" />
                          <span className="text-sm font-black text-nexus-text uppercase tracking-widest highlight-text">{simulatedOnlineCount} ONLINE</span>
                        </div>
                      <button className="bg-nexus-accent text-white font-black px-10 py-4 rounded-3xl shadow-2xl shadow-nexus-accent/30 hover:scale-105 active:scale-95 transition-all text-xs tracking-widest uppercase highlight-text">
                        FIND WARRIORS
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Friends List */}
                    <div className="lg:col-span-2 space-y-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black tracking-tight text-nexus-text uppercase italic highlight-text">YOUR ALLIANCES</h3>
                        <div className="flex items-center gap-6">
                          <span className="text-[10px] font-black text-nexus-dim uppercase tracking-widest opacity-60">SORT BY: RECENT</span>
                          <div className="relative group">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-nexus-dim group-focus-within:text-nexus-accent transition-colors" />
                            <input 
                              type="text" 
                              value={friendSearch}
                              onChange={(e) => setFriendSearch(e.target.value)}
                              placeholder="SEARCH ALLIANCES..."
                              className="bg-white/5 border border-nexus-border rounded-2xl pl-12 pr-6 py-3 text-xs font-black tracking-widest focus:outline-none focus:border-nexus-accent/50 transition-all text-nexus-text placeholder:text-nexus-dim uppercase"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {userData.friends
                          .filter(f => f.name.toLowerCase().includes(friendSearch.toLowerCase()))
                          .map((friend) => (
                          <motion.div 
                            layout
                            key={friend.id}
                            className="nexus-card rounded-[2.5rem] p-8 border-nexus-border hover:border-nexus-accent/30 transition-all group relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-accent/5 blur-3xl rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            
                            <div className="flex items-center gap-6 mb-8 relative z-10">
                              <div className="relative">
                                <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-white/5 group-hover:border-nexus-accent/30 transition-all shadow-2xl">
                                  <img src={friend.avatar || undefined} alt={friend.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <div className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full border-4 border-nexus-dark shadow-lg ${
                                  usersStatus[friend.id] ? 'bg-green-500' : 'bg-nexus-dim'
                                }`} />
                              </div>
                              <div>
                                <h4 className="text-xl font-black text-nexus-text uppercase tracking-tight group-hover:text-nexus-accent transition-colors highlight-text">{friend.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={`w-2 h-2 rounded-full ${usersStatus[friend.id] ? 'bg-green-500 animate-pulse' : 'bg-nexus-dim'}`} />
                                  <p className="text-[11px] font-black text-nexus-dim uppercase tracking-widest">{usersStatus[friend.id] ? 'online' : 'offline'}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-3 relative z-10">
                              <button 
                                onClick={() => setActivePrivateChat(friend)}
                                className="flex-1 bg-nexus-accent/10 hover:bg-nexus-accent text-nexus-accent hover:text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-nexus-accent/20 highlight-text"
                              >
                                <MessageSquare size={16} /> MESSAGE
                              </button>
                              <button 
                                onClick={() => removeFriend(friend.id)}
                                className="px-5 bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-nexus-dim rounded-2xl transition-all border border-transparent hover:border-red-500/20"
                              >
                                <UserMinus size={20} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {userData.friends.length === 0 && (
                        <div className="nexus-card rounded-[3rem] p-20 text-center border-dashed border-nexus-border">
                          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-nexus-dim opacity-50">
                            <Users size={40} />
                          </div>
                          <h4 className="text-2xl font-black text-nexus-text uppercase tracking-tight mb-2 highlight-text">NO ALLIANCES YET</h4>
                          <p className="text-nexus-dim text-sm font-medium max-w-xs mx-auto leading-relaxed">Start discovering other warriors to build your network and dominate the realms.</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black tracking-tight text-nexus-text uppercase italic">DISCOVER WARRIORS</h3>
                        <div className="flex gap-2">
                          <button className="p-2 bg-white/5 rounded-lg text-nexus-dim hover:text-nexus-accent transition-colors">
                            <Search size={16} />
                          </button>
                          <button className="p-2 bg-white/5 rounded-lg text-nexus-dim hover:text-nexus-accent transition-colors">
                            <Bell size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="glass-panel rounded-[2.5rem] p-8 border-white/5 space-y-8">
                        <div className="space-y-4">
                          {!userData.isGuest ? (
                            <>
                              <p className="text-[10px] font-black text-nexus-accent uppercase tracking-widest">PENDING REQUESTS (2)</p>
                              <div className="space-y-3">
                                {[
                                  { id: 'req1', name: 'Shadow_Reaper', avatar: 'https://picsum.photos/seed/shadow/100/100' },
                                  { id: 'req2', name: 'Glitch_Master', avatar: 'https://picsum.photos/seed/glitch/100/100' }
                                ].map(req => (
                                  <div key={req.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                    <img src={req.avatar || undefined} alt={req.name} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
                                    <div className="flex-1">
                                      <p className="text-xs font-black text-nexus-text uppercase tracking-tight">{req.name}</p>
                                      <p className="text-[8px] font-black text-nexus-dim uppercase tracking-widest">Wants to join your alliance</p>
                                    </div>
                                    <div className="flex gap-1">
                                      <button className="p-2 bg-nexus-accent/20 text-nexus-accent rounded-lg hover:bg-nexus-accent hover:text-white transition-all">
                                        <Check size={14} />
                                      </button>
                                      <button className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                        <X size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="p-6 bg-white/5 rounded-3xl border border-dashed border-nexus-border text-center">
                              <Lock size={24} className="text-nexus-dim mx-auto mb-3 opacity-50" />
                              <p className="text-[10px] font-black text-nexus-dim uppercase tracking-widest">Login to see requests</p>
                            </div>
                          )}
                        </div>

                        <div className="h-px bg-white/5 w-full" />

                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-nexus-dim uppercase tracking-widest">SUGGESTED FOR YOU</p>
                          {suggestedFriends.map((suggested) => (
                            <div key={suggested.id} className="space-y-4 group">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/5 group-hover:border-nexus-accent/30 transition-all">
                                  <img src={suggested.avatar || undefined} alt={suggested.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-black text-nexus-text uppercase tracking-tight text-sm">{suggested.name}</h4>
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${suggested.status === 'online' ? 'bg-green-500' : 'bg-nexus-dim'}`} />
                                    <span className="text-[9px] font-black text-nexus-dim uppercase tracking-widest">{suggested.status}</span>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => addFriend(suggested)}
                                  className="p-3 bg-nexus-accent/10 text-nexus-accent rounded-xl hover:bg-nexus-accent hover:text-white transition-all"
                                >
                                  <UserPlus size={18} />
                                </button>
                              </div>
                              <p className="text-[11px] text-nexus-muted italic leading-relaxed pl-1">
                                "{suggested.bio}"
                              </p>
                              <div className="h-px bg-white/5 w-full group-last:hidden" />
                          </div>
                        ))}
                        </div>
                        
                        <button className="w-full py-4 border border-white/10 rounded-2xl text-[10px] font-black text-nexus-dim uppercase tracking-widest hover:bg-white/5 transition-all">
                          REFRESH SUGGESTIONS
                        </button>
                      </div>

                    <div className="nexus-card rounded-[2.5rem] p-8 border-nexus-accent/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-accent/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-black text-nexus-accent uppercase tracking-tight highlight-text">NEXUS+</h4>
                        <Star size={12} className="text-nexus-accent fill-current highlight-icon" />
                      </div>
                      <p className="text-xs text-nexus-muted leading-relaxed mb-6 font-medium">Upgrade to NEXUS+ to see who visited your profile and unlock advanced networking features.</p>
                      <button 
                        onClick={() => setIsPaymentOpen(true)}
                        className="w-full bg-nexus-accent text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-nexus-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all highlight-text"
                      >
                        UPGRADE NOW
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentView === 'servers' && (
              <motion.div 
                key="servers"
                initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-nexus-text uppercase italic leading-none highlight-text">SERVER BROWSER</h2>
                    <p className="text-nexus-muted text-sm md:text-base mt-2 font-medium max-w-xl">Find and join high-performance Nexus game servers</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative w-full md:w-80 group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-nexus-dim group-focus-within:text-nexus-accent transition-colors" size={16} />
                      <input 
                        type="text" 
                        placeholder="SEARCH SERVERS..."
                        value={serverSearch}
                        onChange={(e) => setServerSearch(e.target.value)}
                        className="w-full bg-white/5 border border-nexus-border rounded-2xl pl-12 pr-6 py-4 text-xs font-black tracking-widest focus:outline-none focus:border-nexus-accent/50 transition-all text-nexus-text placeholder:text-nexus-dim uppercase"
                      />
                    </div>
                    <div className="flex bg-nexus-dark/50 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                      {(['ALL', 'ONLINE', 'MAINTENANCE'] as const).map(f => (
                        <button 
                          key={f}
                          onClick={() => setServerFilter(f)}
                          className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${serverFilter === f ? 'bg-nexus-accent text-white shadow-lg shadow-nexus-accent/20 highlight-text' : 'text-nexus-dim hover:text-nexus-text'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <div className="flex items-center gap-3 glass-panel border-nexus-border px-4 py-2 rounded-2xl">
                    <span className="text-[10px] font-black text-nexus-dim uppercase tracking-widest">Type:</span>
                    <select 
                      value={serverTypeFilter}
                      onChange={(e) => setServerTypeFilter(e.target.value)}
                      className="bg-transparent text-[10px] font-black text-nexus-text uppercase tracking-widest focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">ALL TYPES</option>
                      <option value="Survival">SURVIVAL</option>
                      <option value="Creative">CREATIVE</option>
                      <option value="Factions">FACTIONS</option>
                      <option value="Skyblock">SKYBLOCK</option>
                      <option value="Prison">PRISON</option>
                      <option value="Minigames">MINIGAMES</option>
                      <option value="RP">ROLEPLAY</option>
                      <option value="PvP">PVP</option>
                      <option value="RPG">RPG</option>
                      <option value="Vanilla">VANILLA</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 glass-panel border-nexus-border px-4 py-2 rounded-2xl">
                    <span className="text-[10px] font-black text-nexus-dim uppercase tracking-widest">Region:</span>
                    <select 
                      value={regionFilter}
                      onChange={(e) => setRegionFilter(e.target.value)}
                      className="bg-transparent text-[10px] font-black text-nexus-text uppercase tracking-widest focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">ALL REGIONS</option>
                      <option value="GLOBAL">GLOBAL</option>
                      <option value="US-EAST">US-EAST</option>
                      <option value="US-WEST">US-WEST</option>
                      <option value="US-CENTRAL">US-CENTRAL</option>
                      <option value="EU-WEST">EU-WEST</option>
                      <option value="EU-CENTRAL">EU-CENTRAL</option>
                      <option value="EU-NORTH">EU-NORTH</option>
                      <option value="ASIA-EAST">ASIA-EAST</option>
                      <option value="ASIA-SOUTH">ASIA-SOUTH</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {filteredServers.length > 0 ? (
                    filteredServers.map(server => (
                      <motion.div 
                        key={server.id}
                        layout
                        className="nexus-card rounded-[2.5rem] p-8 border-nexus-border hover:border-nexus-accent/30 transition-all group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-accent/5 blur-[100px] rounded-full -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                          <div className="flex items-center gap-8">
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 shadow-2xl transition-transform duration-500 group-hover:scale-110 ${
                              server.status === 'online' ? 'bg-green-500/10 text-green-400 shadow-green-500/10' : 
                              server.status === 'maintenance' ? 'bg-yellow-500/10 text-yellow-400 shadow-yellow-500/10' : 
                              'bg-red-500/10 text-red-400 shadow-red-500/10'
                            }`}>
                              <Globe size={36} className="highlight-icon" />
                            </div>
                            <div>
                              <div className="flex items-center gap-4 mb-2">
                                <h3 className="text-xl md:text-2xl font-black tracking-tight text-nexus-text uppercase italic highlight-text">{server.name}</h3>
                                <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black text-nexus-accent uppercase tracking-widest border border-nexus-accent/20 highlight-text">
                                  {server.type} {server.category ? `• ${server.category}` : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    server.status === 'online' ? 'bg-green-500 animate-pulse' : 
                                    server.status === 'maintenance' ? 'bg-yellow-500' : 
                                    'bg-red-500'
                                  }`} />
                                  <span className="text-[11px] font-black text-nexus-dim uppercase tracking-widest highlight-text">{server.status}</span>
                                </div>
                                <div className="w-px h-4 bg-white/10" />
                                <div className="flex items-center gap-2">
                                  <MapPin size={14} className="text-nexus-dim highlight-icon" />
                                  <span className="text-[11px] font-black text-nexus-dim uppercase tracking-widest highlight-text">{server.region}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-10 lg:gap-16">
                            <div className="text-center">
                              <p className="text-[10px] font-black text-nexus-dim uppercase tracking-widest mb-1.5 opacity-60">Players</p>
                              <p className="text-2xl font-black text-nexus-text highlight-text">
                                {server.players}<span className="text-nexus-dim opacity-40">/{server.maxPlayers}</span>
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-black text-nexus-dim uppercase tracking-widest mb-1.5 opacity-60">Ping</p>
                              <div className="flex items-center gap-2 justify-center">
                                <Signal size={14} className={server.ping < 50 ? 'text-green-400' : server.ping < 100 ? 'text-yellow-400' : 'text-red-400'} />
                                <p className="text-2xl font-black text-nexus-text highlight-text">{server.ping}ms</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleJoinServer(server.name)}
                              className="px-10 py-5 bg-nexus-accent text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-nexus-accent/20 hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-50 disabled:scale-100 highlight-text" 
                              disabled={server.status !== 'online'}
                            >
                              {server.status === 'online' ? 'JOIN SERVER' : 'UNAVAILABLE'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-20 text-center glass-panel rounded-[3rem] border-nexus-border">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search size={32} className="text-nexus-dim" />
                      </div>
                      <h3 className="text-xl font-black text-nexus-text uppercase tracking-tight">No servers found</h3>
                      <p className="text-nexus-muted text-sm mt-2">Try adjusting your search or filters</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {currentView === 'games' && (
              <motion.div 
                key="games"
                initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-black tracking-tighter text-nexus-text uppercase">GAMES LIBRARY</h2>
                      <div className="flex gap-2">
                        {['ALL', 'ACTION', 'RPG', 'STRATEGY'].map(cat => (
                          <button key={cat} className="px-4 py-2 glass-panel border-nexus-border rounded-xl text-[10px] font-black tracking-widest text-nexus-muted hover:text-nexus-accent transition-colors uppercase">
                            {cat}
                          </button>
                        ))}
                      </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <GameCard 
                    title="Minecraft" 
                    players="12.4k" 
                    image="https://images.unsplash.com/photo-1627398242454-45a1465c2479?auto=format&fit=crop&q=80&w=800" 
                    logo="https://www.minecraft.net/etc.clientlibs/minecraft/clientlibs/main/resources/img/minecraft-logo.png"
                    icon={Sword} 
                  />
                  <GameCard 
                    title="Cyberpunk 2077" 
                    players="3.1k" 
                    image="https://images.unsplash.com/photo-1605898960710-9aa693375865?auto=format&fit=crop&q=80&w=800" 
                    logo="https://upload.wikimedia.org/wikipedia/commons/e/e4/Cyberpunk_2077_logo.svg"
                    icon={Zap} 
                  />
                  <GameCard 
                    title="Elden Ring" 
                    players="1.2k" 
                    image="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=800" 
                    logo="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Elden_Ring_logo.svg/1200px-Elden_Ring_logo.svg.png"
                    icon={Shield} 
                  />
                  <GameCard 
                    title="Rust" 
                    players="5.6k" 
                    image="https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=800" 
                    logo="https://files.facepunch.com/lewis/1b2911b1/rust-logo.png"
                    icon={Shield} 
                  />
                  <GameCard 
                    title="Counter-Strike 2" 
                    players="15.9k" 
                    image="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=800" 
                    logo="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/CS2_Logo.svg/1200px-CS2_Logo.svg.png"
                    icon={Sword} 
                  />
                  <GameCard 
                    title="League of Legends" 
                    players="22.4k" 
                    image="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800" 
                    logo="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/League_of_Legends_2019_vector.svg/1200px-League_of_Legends_2019_vector.svg.png"
                    icon={Zap} 
                  />
                  <GameCard 
                    title="Dota 2" 
                    players="18.1k" 
                    image="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800" 
                    logo="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Dota_2_Logo.svg/1200px-Dota_2_Logo.svg.png"
                    icon={Shield} 
                  />
                  <GameCard 
                    title="Apex Legends" 
                    players="9.4k" 
                    image="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800" 
                    logo="https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Apex_Legends_logo.svg/1200px-Apex_Legends_logo.svg.png"
                    icon={Zap} 
                  />
                </div>
              </motion.div>
            )}

            {currentView === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="h-[calc(100vh-12rem)] flex flex-col glass-panel rounded-3xl overflow-hidden"
              >
                <div className="p-6 border-b border-nexus-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-nexus-accent/20 rounded-xl flex items-center justify-center text-nexus-accent">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-nexus-text">Global Nexus Chat</h3>
                      <p className="text-xs text-green-400 font-bold">100k members online • 400k+ Total Members</p>
                    </div>
                  </div>
                  <div className="relative w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-dim" />
                    <input 
                      type="text" 
                      value={globalChatSearch}
                      onChange={(e) => setGlobalChatSearch(e.target.value)}
                      placeholder="SEARCH MESSAGES..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[10px] font-black tracking-widest focus:outline-none focus:border-nexus-accent/30 transition-all text-nexus-text placeholder:text-nexus-dim"
                    />
                  </div>
                </div>
                <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
                  {messages
                    .filter(m => m.msg.toLowerCase().includes(globalChatSearch.toLowerCase()))
                    .map((chat, i) => (
                    <div 
                      key={i} 
                      className={`flex gap-4 group relative ${chat.user === userData.name ? 'flex-row-reverse' : ''}`}
                      onMouseEnter={() => setHoveredMessageIndex(i)}
                      onMouseLeave={() => setHoveredMessageIndex(null)}
                    >
                      <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-xs overflow-hidden ${
                        chat.isMod ? 'bg-nexus-accent text-white' : 
                        chat.isAI && chat.isMentioned ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
                        'bg-white/5 text-nexus-muted'
                      }`}>
                        {chat.avatar ? (
                          <img src={chat.avatar || undefined} alt={chat.user} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          chat.isAI && chat.isMentioned ? 'AI' : chat.user[0].toUpperCase()
                        )}
                      </div>
                      <div className={chat.user === userData.name ? 'text-right' : ''}>
                        <div className={`flex items-center gap-2 mb-1 ${chat.user === userData.name ? 'flex-row-reverse' : ''}`}>
                          <span className={`font-bold text-sm ${
                            chat.isMod ? 'text-nexus-accent' : 
                            chat.isAI && chat.isMentioned ? 'text-blue-400' : 
                            'text-nexus-text'
                          }`}>
                            {chat.user}
                            {chat.isAI && chat.isMentioned && <span className="ml-1 text-[8px] bg-blue-500/20 px-1 rounded border border-blue-500/30 uppercase">Bot</span>}
                          </span>
                          <span className="text-[10px] text-nexus-dim">{chat.time}</span>
                        </div>
                        <div className="relative group">
                          <p className={`text-sm text-nexus-muted glass-panel px-4 py-2 rounded-2xl inline-block max-w-[80%] ${
                            chat.user === userData.name ? 'rounded-tr-none bg-nexus-accent/5 border-nexus-accent/20' : 'rounded-tl-none'
                          }`}>
                            {chat.msg}
                          </p>
                          
                          {/* Quick Actions */}
                          {hoveredMessageIndex === i && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`absolute -top-8 ${chat.user === userData.name ? 'right-0' : 'left-0'} flex gap-1 bg-nexus-dark/95 backdrop-blur-xl border border-white/10 p-1 rounded-xl shadow-2xl z-20`}
                            >
                              <Tooltip content="Reply" position="top">
                                <button 
                                  onClick={() => setChatInput(`@${chat.user} `)}
                                  className="p-1.5 hover:bg-white/10 rounded-lg text-nexus-muted hover:text-nexus-accent transition-all"
                                >
                                  <Reply size={14} />
                                </button>
                              </Tooltip>
                              <Tooltip content="Copy Message" position="top">
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(chat.msg);
                                    // Could add a toast here
                                  }}
                                  className="p-1.5 hover:bg-white/10 rounded-lg text-nexus-muted hover:text-nexus-accent transition-all"
                                >
                                  <Copy size={14} />
                                </button>
                              </Tooltip>
                              <div className="w-px h-4 bg-white/10 self-center mx-1" />
                              {['🔥', '❤️', '🎮', '😮'].map(emoji => (
                                <button 
                                  key={emoji}
                                  onClick={() => alert(`Reacted with ${emoji}`)}
                                  className="p-1.5 hover:bg-white/10 rounded-lg text-xs hover:scale-125 transition-all"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </motion.div>
                          )}

                          {/* Moderation Tools */}
                          {userData.name === 'Nexus_Mod' && chat.user !== userData.name && hoveredMessageIndex === i && (
                            <motion.div 
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`absolute top-0 ${chat.user === userData.name ? 'right-full mr-2' : 'left-full ml-2'} flex gap-1 bg-nexus-dark/90 backdrop-blur-md border border-nexus-border p-1 rounded-lg shadow-xl z-10`}
                            >
                              <button 
                                onClick={() => alert(`Flagged message from ${chat.user}`)}
                                className="p-1.5 hover:bg-white/10 rounded-md text-nexus-muted hover:text-red-500 transition-colors"
                                title="Flag Message"
                              >
                                <Flag size={14} />
                              </button>
                              <button 
                                onClick={() => alert(`Muted ${chat.user} for 24 hours`)}
                                className="p-1.5 hover:bg-white/10 rounded-md text-nexus-muted hover:text-nexus-accent transition-colors"
                                title="Mute User"
                              >
                                <MicOff size={14} />
                              </button>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isAiTyping && typingUser && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 pl-2"
                    >
                      <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/5 rounded-2xl shadow-sm">
                        <div className="w-6 h-6 rounded-lg overflow-hidden border border-nexus-accent/20">
                          <img src={typingUser.avatar} alt={typingUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-nexus-accent uppercase tracking-widest">{typingUser.name} is typing...</span>
                          <div className="flex gap-1 mt-0.5">
                            <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1 h-1 bg-nexus-accent rounded-full" />
                            <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-nexus-accent rounded-full" />
                            <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-nexus-accent rounded-full" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
                <div className="p-6 border-t border-nexus-border bg-white/[0.02]">
                  <form onSubmit={handleSendMessage} className="flex gap-4">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type your message to the community..."
                      className="flex-1 bg-white/5 border border-nexus-border rounded-xl px-4 py-3 focus:outline-none focus:border-nexus-accent/50 transition-all text-nexus-text placeholder:text-nexus-dim"
                    />
                    <Tooltip content="Broadcast your message to all online players" position="top">
                      <button 
                        type="submit"
                        disabled={!chatInput.trim() || isAiTyping}
                        className="bg-nexus-accent text-white px-6 py-3 rounded-xl font-black text-xs tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                      >
                        SEND
                      </button>
                    </Tooltip>
                  </form>
                </div>
              </motion.div>
            )}

            {currentView === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-6xl mx-auto w-full pb-20"
              >
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {/* Settings Sidebar */}
                  <div className="w-full md:w-64 shrink-0 space-y-2">
                    <div className="mb-6 px-2">
                      <h2 className="text-2xl font-black tracking-tighter uppercase text-nexus-text">SETTINGS</h2>
                      <p className="text-nexus-dim text-[10px] font-bold uppercase tracking-widest mt-1">Control your Nexus identity</p>
                    </div>
                    
                    {[
                      { id: 'profile', label: 'Profile', icon: User },
                      { id: 'security', label: 'Security', icon: Lock },
                      { id: 'payment', label: 'Payment', icon: CreditCard },
                      { id: 'notifications', label: 'Alerts', icon: Bell },
                      { id: 'account', label: 'Account', icon: Shield },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveSettingsTab(tab.id as any)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                          activeSettingsTab === tab.id 
                            ? 'bg-nexus-accent text-white shadow-lg shadow-nexus-accent/20' 
                            : 'text-nexus-dim hover:bg-white/5 hover:text-nexus-text'
                        }`}
                      >
                        <tab.icon size={16} />
                        {tab.label}
                      </button>
                    ))}

                    <div className="pt-8 px-2">
                      <button 
                        onClick={() => {
                          if (userData.isGuest) {
                            setIsLoginRequiredOpen(true);
                            return;
                          }
                          setSettingsSaveStatus('saving');
                          setTimeout(() => {
                            setSettingsSaveStatus('saved');
                            setTimeout(() => setSettingsSaveStatus('idle'), 3000);
                          }, 1500);
                        }}
                        disabled={settingsSaveStatus === 'saving'}
                        className="w-full bg-nexus-accent text-white font-black py-4 rounded-xl shadow-lg shadow-nexus-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-[10px] tracking-widest uppercase highlight-text disabled:opacity-50"
                      >
                        {settingsSaveStatus === 'saving' ? 'SAVING...' : settingsSaveStatus === 'saved' ? 'SAVED' : 'SAVE CHANGES'}
                      </button>
                    </div>
                  </div>

                  {/* Settings Content */}
                  <div className="flex-1 w-full space-y-6">
                    <AnimatePresence mode="wait">
                      {activeSettingsTab === 'profile' && (
                        <motion.div
                          key="profile"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-6"
                        >
                          <div className="nexus-card p-8 space-y-8">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xl font-black uppercase tracking-tight">Identity & Avatar</h3>
                              <div className="flex items-center gap-2 bg-white/5 border border-nexus-border p-1 rounded-lg">
                                {(['member', 'moderator', 'admin'] as UserRole[]).map((role) => (
                                  <button
                                    key={role}
                                    onClick={() => {
                                      if (role === 'member') setUserData({ ...userData, role });
                                      else { setPendingRole(role); setIsRoleModalOpen(true); }
                                    }}
                                    className={`px-3 py-1.5 rounded-md text-[8px] font-black transition-all uppercase tracking-widest ${
                                      userData.role === role ? 'bg-nexus-accent text-white' : 'text-nexus-dim hover:text-nexus-text'
                                    }`}
                                  >
                                    {role}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                              <div className="relative group">
                                <div className="w-32 h-32 rounded-[2rem] overflow-hidden border-4 border-nexus-accent/30 p-1">
                                  <img src={userData.avatar || undefined} alt="Avatar" className="w-full h-full object-cover rounded-[1.5rem]" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-nexus-dark/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[1.5rem]">
                                    <label className="cursor-pointer p-3 bg-nexus-accent text-white rounded-xl hover:scale-110 transition-transform">
                                      <Upload size={20} />
                                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                    </label>
                                  </div>
                                </div>
                              </div>
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Full Name</label>
                                  <input 
                                    type="text" 
                                    value={userData.name} 
                                    disabled={userData.isGuest}
                                    onChange={(e) => setUserData({...userData, name: e.target.value})}
                                    className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3 text-sm font-bold focus:border-nexus-accent/30 transition-all text-nexus-text disabled:opacity-50" 
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Email</label>
                                  <input 
                                    type="email" 
                                    value={userData.email} 
                                    disabled={userData.isGuest}
                                    onChange={(e) => setUserData({...userData, email: e.target.value})}
                                    className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3 text-sm font-bold focus:border-nexus-accent/30 transition-all text-nexus-text disabled:opacity-50" 
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                  <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Bio</label>
                                  <textarea 
                                    value={userData.bio} 
                                    onChange={(e) => setUserData({...userData, bio: e.target.value})}
                                    className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3 text-sm font-bold focus:border-nexus-accent/30 transition-all text-nexus-text h-24 resize-none" 
                                    placeholder="Tell the community about yourself..."
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="nexus-card p-8 space-y-6">
                            <h3 className="text-xl font-black uppercase tracking-tight">Gaming Profile</h3>
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Preferred Games</label>
                                <input 
                                  type="text" 
                                  value={userData.preferredGames.join(', ')} 
                                  onChange={(e) => setUserData({...userData, preferredGames: e.target.value.split(',').map(s => s.trim())})}
                                  className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3 text-sm font-bold focus:border-nexus-accent/30 transition-all text-nexus-text" 
                                  placeholder="Minecraft, Valorant, etc."
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Twitter</label>
                                  <input type="text" value={userData.socialLinks.twitter} onChange={(e) => setUserData({...userData, socialLinks: {...userData.socialLinks, twitter: e.target.value}})} className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3 text-sm font-bold text-nexus-text" />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Twitch</label>
                                  <input type="text" value={userData.socialLinks.twitch} onChange={(e) => setUserData({...userData, socialLinks: {...userData.socialLinks, twitch: e.target.value}})} className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3 text-sm font-bold text-nexus-text" />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Discord</label>
                                  <input type="text" value={userData.socialLinks.discord} onChange={(e) => setUserData({...userData, socialLinks: {...userData.socialLinks, discord: e.target.value}})} className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3 text-sm font-bold text-nexus-text" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeSettingsTab === 'security' && (
                        <motion.div
                          key="security"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-6"
                        >
                          <div className="nexus-card p-8 space-y-6">
                            <h3 className="text-xl font-black uppercase tracking-tight">Security & Access</h3>
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Backup Password</label>
                                <input type="password" value={userData.backupPassword} onChange={(e) => setUserData({...userData, backupPassword: e.target.value})} className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3 text-sm font-bold text-nexus-text" />
                              </div>
                              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-nexus-border">
                                <div>
                                  <p className="text-sm font-black uppercase tracking-tight text-nexus-text">Appearance Mode</p>
                                  <p className="text-[10px] text-nexus-dim font-bold uppercase tracking-widest">{theme === 'dark' ? 'Dark' : 'Day'} mode active</p>
                                </div>
                                <div className="flex bg-nexus-dark/50 p-1 rounded-xl border border-white/5">
                                  <button onClick={() => setTheme('light')} className={`p-2 rounded-lg transition-all ${theme === 'light' ? 'bg-nexus-accent text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><Sun size={16} /></button>
                                  <button onClick={() => setTheme('dark')} className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-nexus-accent text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><Moon size={16} /></button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="nexus-card p-8 space-y-6">
                            <h3 className="text-xl font-black uppercase tracking-tight">Identity Verification</h3>
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-3">
                                {(['NID', 'Passport', 'Driving License'] as const).map((type) => (
                                  <button key={type} onClick={() => setUserData({...userData, verification: { ...userData.verification, type }})} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${userData.verification.type === type ? 'bg-nexus-accent/10 border-nexus-accent/50 text-nexus-accent' : 'bg-white/5 border-white/5 text-nexus-muted hover:border-white/20'}`}>{type}</button>
                                ))}
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Document Number</label>
                                <input type="text" value={userData.verification.number} onChange={(e) => setUserData({...userData, verification: { ...userData.verification, number: e.target.value }})} placeholder={`Enter your ${userData.verification.type} number...`} className="w-full bg-white/5 border border-nexus-border rounded-xl px-4 py-3 text-sm font-bold text-nexus-text" />
                              </div>
                              
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Upload Document Photo</label>
                                <div className="relative group">
                                  <div className="w-full h-32 rounded-2xl border-2 border-dashed border-nexus-border group-hover:border-nexus-accent/40 transition-all flex flex-col items-center justify-center gap-2 bg-white/[0.02]">
                                    <Camera size={24} className="text-nexus-dim group-hover:text-nexus-accent transition-colors" />
                                    <p className="text-[10px] font-black text-nexus-dim uppercase tracking-widest">Click to upload {userData.verification.type} photo</p>
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                  </div>
                                </div>
                              </div>

                              <button 
                                disabled={!userData.verification.number || userData.verification.status === 'verified'}
                                onClick={() => setUserData({...userData, verification: {...userData.verification, status: 'pending'}})}
                                className="w-full bg-nexus-accent text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-nexus-accent/20 disabled:opacity-50"
                              >
                                {userData.verification.status === 'pending' ? 'PENDING...' : userData.verification.status === 'verified' ? 'VERIFIED' : 'VERIFY IDENTITY'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeSettingsTab === 'payment' && (
                        <motion.div
                          key="payment"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-6"
                        >
                          <div className="nexus-card p-8 space-y-6">
                            <h3 className="text-xl font-black uppercase tracking-tight">Payment Methods</h3>
                            <div className="space-y-4">
                              <div className="p-5 bg-white/5 rounded-2xl border border-nexus-border flex items-center justify-between group hover:border-nexus-accent/30 transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-8 bg-nexus-dark rounded-lg flex items-center justify-center border border-nexus-border"><span className="text-[8px] font-black italic text-nexus-dim">VISA</span></div>
                                  <div>
                                    <p className="text-sm font-black font-mono tracking-widest text-nexus-text">{userData.savedCard}</p>
                                    <p className="text-[10px] text-nexus-dim font-bold uppercase tracking-widest">Expires 12/28</p>
                                  </div>
                                </div>
                                <button className="text-nexus-dim hover:text-red-400 transition-colors"><X size={16} /></button>
                              </div>
                              <button onClick={() => userData.isGuest ? setIsLoginRequiredOpen(true) : setIsPaymentOpen(true)} className="w-full py-4 border border-dashed border-nexus-border rounded-2xl text-[10px] font-black text-nexus-dim uppercase tracking-widest hover:border-nexus-accent/50 hover:text-nexus-accent transition-all">+ ADD NEW PAYMENT METHOD</button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeSettingsTab === 'notifications' && (
                        <motion.div
                          key="notifications"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-6"
                        >
                          <div className="nexus-card p-8 space-y-6">
                            <h3 className="text-xl font-black uppercase tracking-tight">Notification Preferences</h3>
                            <div className="space-y-4">
                              {[
                                { id: 'friend_requests', label: 'Friend Requests', desc: 'When someone wants to join your squad' },
                                { id: 'messages', label: 'Direct Messages', desc: 'Private transmissions from other warriors' },
                                { id: 'achievements', label: 'Achievements', desc: 'When you reach a new milestone' },
                                { id: 'announcements', label: 'Nexus Announcements', desc: 'Critical system updates and events' }
                              ].map((pref) => (
                                <div key={pref.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-nexus-border">
                                  <div>
                                    <p className="text-sm font-black uppercase tracking-tight text-nexus-text">{pref.label}</p>
                                    <p className="text-[10px] text-nexus-dim font-bold uppercase tracking-widest">{pref.desc}</p>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const newPrefs = { ...userData.notificationsEnabled, [pref.id]: !userData.notificationsEnabled?.[pref.id] };
                                      setUserData({ ...userData, notificationsEnabled: newPrefs });
                                    }}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${userData.notificationsEnabled?.[pref.id] !== false ? 'bg-nexus-accent' : 'bg-white/10'}`}
                                  >
                                    <motion.div animate={{ x: userData.notificationsEnabled?.[pref.id] !== false ? 22 : 4 }} className="absolute top-1 w-3 h-3 bg-nexus-dark rounded-full" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeSettingsTab === 'account' && (
                        <motion.div
                          key="account"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-6"
                        >
                          <div className="nexus-card p-8 space-y-6 border-red-500/20 bg-red-500/[0.02]">
                            <h3 className="text-xl font-black uppercase tracking-tight text-red-400">Danger Zone</h3>
                            <div className="space-y-4">
                              <button onClick={handleLogout} className="w-full flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-nexus-border hover:border-nexus-accent/30 transition-all group">
                                <div className="flex items-center gap-4">
                                  <div className="p-2 bg-nexus-accent/10 rounded-xl group-hover:bg-nexus-accent/20 transition-colors"><LogOut size={20} className="text-nexus-accent" /></div>
                                  <div className="text-left">
                                    <p className="text-sm font-black uppercase tracking-tight text-nexus-text">Sign Out</p>
                                    <p className="text-[10px] text-nexus-dim font-bold uppercase tracking-widest">Safely terminate your session</p>
                                  </div>
                                </div>
                                <ChevronRight size={16} className="text-nexus-dim group-hover:text-nexus-accent transition-colors" />
                              </button>
                              <button onClick={() => window.confirm("Delete account?") && alert("Request submitted.")} className="w-full flex items-center justify-between p-5 bg-red-500/5 rounded-2xl border border-red-500/10 hover:border-red-500/30 transition-all group">
                                <div className="flex items-center gap-4">
                                  <div className="p-2 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors"><X size={20} className="text-red-400" /></div>
                                  <div className="text-left">
                                    <p className="text-sm font-black uppercase tracking-tight text-red-400">Delete Account</p>
                                    <p className="text-[10px] text-red-500/50 font-bold uppercase tracking-widest">Permanently erase your identity</p>
                                  </div>
                                </div>
                                <ChevronRight size={16} className="text-red-500/50 group-hover:text-red-400 transition-colors" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
            {currentView === 'admin' && userData.role === 'admin' && (
              <motion.div 
                key="admin"
                initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <AdminPanel currentUser={currentUser} userData={userData} logAdminAction={logAdminAction} />
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
      {/* Private Chat Overlay */}
      <AnimatePresence>
        {isMatchCodeModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMatchCodeModalOpen(false)}
              className="absolute inset-0 bg-nexus-dark/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md glass-panel p-8 rounded-[2.5rem] relative z-10 border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.1)]"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                  <Lock size={40} className="text-red-500 animate-pulse" />
                </div>
                <h2 className="text-2xl font-black tracking-tighter uppercase text-white italic highlight-text">MATCH CODE REQUIRED</h2>
                <p className="text-nexus-dim text-[10px] font-black uppercase tracking-[0.3em] mt-2">Accessing {selectedRealm}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-nexus-dim uppercase tracking-widest ml-1">Enter 6-Digit Match Code</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    value={matchCode}
                    onChange={(e) => setMatchCode(e.target.value.toUpperCase())}
                    placeholder="X X X X X X"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-xl font-black tracking-[0.5em] focus:outline-none focus:border-red-500/50 transition-all text-center text-white placeholder:text-white/10"
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsMatchCodeModalOpen(false)}
                    className="flex-1 bg-white/5 text-white font-black py-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-all uppercase tracking-widest text-[10px]"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={() => {
                      if (matchCode.length === 6) {
                        setIsMatchCodeModalOpen(false);
                        setMatchCode('');
                        setIsConnectingToServer(true);
                        setTimeout(() => {
                          setIsConnectingToServer(false);
                          setCurrentView('dashboard');
                        }, 2000);
                      }
                    }}
                    disabled={matchCode.length !== 6}
                    className="flex-[2] bg-red-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-[10px] highlight-text disabled:opacity-50"
                  >
                    VERIFY & JOIN
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePrivateChat && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-6 right-6 w-80 md:w-96 glass-panel rounded-3xl shadow-2xl border border-nexus-accent/30 z-[100] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-nexus-accent/10 border-b border-nexus-accent/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-nexus-accent/30">
                    <img src={activePrivateChat.avatar || undefined} alt={activePrivateChat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-nexus-dark ${
                    usersStatus[activePrivateChat.id] ? 'bg-green-500' : 'bg-nexus-dim'
                  }`} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-nexus-text uppercase tracking-tight">{activePrivateChat.name}</h4>
                  <p className="text-[8px] font-black text-nexus-accent uppercase tracking-widest">{usersStatus[activePrivateChat.id] ? 'online' : 'offline'}</p>
                </div>
              </div>
              <button 
                onClick={() => setActivePrivateChat(null)}
                className="p-2 hover:bg-white/10 rounded-xl text-nexus-dim hover:text-nexus-text transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 h-80 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-nexus-dark/50">
              {privateMessages.length > 0 ? (
                privateMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium leading-relaxed ${
                      msg.senderId === currentUser?.uid 
                        ? 'bg-nexus-accent text-white rounded-tr-none' 
                        : 'bg-white/5 text-nexus-text border border-white/10 rounded-tl-none'
                    }`}>
                      {msg.text}
                      <div className={`text-[8px] mt-1 opacity-50 ${msg.senderId === currentUser?.uid ? 'text-right' : 'text-left'}`}>
                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-2">
                  <MessageSquare size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest">No messages yet</p>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white/[0.02] border-t border-nexus-accent/20">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendPrivateMessage();
                }}
                className="flex gap-2"
              >
                <input 
                  type="text" 
                  value={privateChatInput}
                  onChange={(e) => setPrivateChatInput(e.target.value)}
                  placeholder="Type a private message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-nexus-accent/50 transition-all text-nexus-text placeholder:text-nexus-dim"
                />
                <button 
                  type="submit"
                  disabled={!privateChatInput.trim()}
                  className="bg-nexus-accent text-white p-2 rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  <Zap size={16} className="fill-current" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}
