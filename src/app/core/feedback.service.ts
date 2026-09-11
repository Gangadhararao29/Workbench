import { Injectable } from '@angular/core';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

export type FeedbackType = 'feedback' | 'bug';
export type FeedbackSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SystemInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  timeZone: string;
  url: string;
  timestamp: string;
}

export interface FeedbackPayload {
  id?: string;
  type: FeedbackType;
  category: string;
  tool?: string;
  title: string;
  description: string;
  stepsToReproduce?: string;
  severity?: FeedbackSeverity;
  rating?: number;
  email?: string;
  includeSystemInfo: boolean;
  systemInfo?: SystemInfo;
  createdAt: string;
  status: 'new' | 'reviewed' | 'in_progress' | 'resolved';
}

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private readonly storageKey = 'workbench_local_feedback';
  private readonly firebaseAppName = 'workbench-feedback';
  private db: Firestore | null = null;
  private isConfigured = false;

  constructor() {
    this.initFirebase();
  }

  private initFirebase(): void {
    try {
      const fbConfig = environment.firebase;
      // Check if config has placeholder values
      const isPlaceholder =
        !fbConfig ||
        !fbConfig.apiKey ||
        fbConfig.apiKey.includes('DUMMY') ||
        !fbConfig.projectId ||
        fbConfig.projectId.includes('placeholder');

      if (isPlaceholder) {
        console.warn(
          '[FeedbackService] Running with dummy/placeholder Firebase config. Submissions will be stored in local browser backup until real Firebase credentials are provided in src/environments/environment.ts.'
        );
        this.isConfigured = false;
        return;
      }

      const existingApp = getApps().find((candidate) => candidate.name === this.firebaseAppName);
      const app: FirebaseApp = existingApp || initializeApp(fbConfig, this.firebaseAppName);

      if (app.options.projectId !== fbConfig.projectId) {
        throw new Error(`Firebase app is configured for project "${app.options.projectId}", expected "${fbConfig.projectId}".`);
      }

      this.db = getFirestore(app);
      this.isConfigured = true;
      console.info('[FeedbackService] Firebase Firestore initialized successfully.');
    } catch (err) {
      console.warn('[FeedbackService] Failed to initialize Firebase:', err);
      this.isConfigured = false;
    }
  }

  /**
   * Safely collects client diagnostic and environment info
   */
  collectSystemInfo(): SystemInfo {
    if (typeof window === 'undefined') {
      return {
        userAgent: 'unknown',
        platform: 'unknown',
        language: 'unknown',
        screenResolution: 'unknown',
        timeZone: 'UTC',
        url: '',
        timestamp: new Date().toISOString()
      };
    }

    return {
      userAgent: navigator.userAgent || 'Unknown',
      platform: (navigator as any).userAgentData?.platform || navigator.platform || 'Unknown',
      language: navigator.language || 'en',
      screenResolution: `${window.innerWidth}x${window.innerHeight} (Display: ${window.screen?.width ?? 0}x${window.screen?.height ?? 0})`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Submits feedback or a bug report.
   * Saves to Firebase Cloud Firestore if configured, with local backup fallback.
   */
  async submitFeedback(payload: Omit<FeedbackPayload, 'createdAt' | 'status'>): Promise<{ success: boolean; id: string }> {
    const fallbackId = 'fb_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const completePayload: FeedbackPayload = {
      ...payload,
      id: fallbackId,
      createdAt: new Date().toISOString(),
      status: 'new',
      systemInfo: payload.includeSystemInfo ? (payload.systemInfo || this.collectSystemInfo()) : undefined
    };

    // Always keep a local copy as backup
    this.saveToLocalBackup(completePayload);

    // Keep bug reports and general feedback in separate Firestore collections.
    if (this.isConfigured && this.db) {
      try {
        const collectionName = completePayload.type === 'bug' ? 'bugs' : 'feedback';
        const feedbackCollection = collection(this.db, collectionName);
        const firestoreData = this.sanitizeForFirestore({
          ...completePayload,
          createdAtServer: serverTimestamp()
        });

        const docRef = await addDoc(feedbackCollection, firestoreData);

        console.info(`[FeedbackService] Written to Cloud Firestore ${collectionName} document ID:`, docRef.id);
        return {
          success: true,
          id: docRef.id
        };
      } catch (firestoreError) {
        // The local copy was saved above, so a blocked browser request or a temporary
        // rules/network issue should not prevent the user from completing the form.
        console.warn('[FeedbackService] Firestore write failed; kept local backup:', firestoreError);
        this.isConfigured = false;
        this.db = null;
        return {
          success: true,
          id: fallbackId
        };
      }
    }

    // Fallback simulation for placeholder/offline mode
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.info('[FeedbackService] Saved submission locally (placeholder mode):', completePayload);

    return {
      success: true,
      id: fallbackId
    };
  }

  private saveToLocalBackup(entry: FeedbackPayload): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const existingStr = localStorage.getItem(this.storageKey);
      const existing: FeedbackPayload[] = existingStr ? JSON.parse(existingStr) : [];
      existing.unshift(entry);
      if (existing.length > 30) {
        existing.length = 30;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(existing));
    } catch {
      // Ignore storage errors
    }
  }

  getLocalSubmissions(): FeedbackPayload[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const existingStr = localStorage.getItem(this.storageKey);
      return existingStr ? JSON.parse(existingStr) : [];
    } catch {
      return [];
    }
  }

  private sanitizeForFirestore(data: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          clean[key] = this.sanitizeForFirestore(value);
        } else {
          clean[key] = value;
        }
      }
    }
    return clean;
  }
}
