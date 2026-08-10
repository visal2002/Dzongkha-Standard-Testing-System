/**
 * @fileoverview DZONGJUK (DSTS) — i18n Configuration
 *
 * Supports English (en) and Dzongkha (dz).
 * Dzongkha translations marked with [dz] prefix are placeholders
 * pending review by a certified Dzongkha linguist.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      app: {
        title: 'Dzongjuk',
        subtitle: 'Dzongkha Standard Testing System',
      },
      nav: {
        dashboard: 'Dashboard',
        user_management: 'User Management',
        role_management: 'Role Management',
        master_settings: 'Master Settings',
        reports: 'Reports',
        exam_windows: 'Exam Windows',
        applications: 'Applications',
        verification: 'Verification',
        attendance: 'Attendance',
        band_scores: 'Band Scores',
        certificates: 'Certificates',
        appeals: 'Appeals',
        question_papers: 'Question Papers',
        sample_papers: 'Sample Papers',
        sign_out: 'Sign Out',
        profile: 'Profile',
        settings: 'Settings',
        notifications: 'Notifications',
      },
      header: {
        switch_role: 'Switch Demo Role',
        profile: 'Profile',
        settings: 'Settings',
      },
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        submit: 'Submit',
        loading: 'Loading…',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        view_all: 'View All',
        no_data: 'No data found',
        confirm: 'Confirm',
        back: 'Back',
      },
      status: {
        submitted: 'Submitted',
        under_review: 'Under Review',
        verified: 'Verified',
        approved: 'Approved',
        returned: 'Returned',
        rejected: 'Rejected',
        absent: 'Absent',
        open: 'Open',
        closed: 'Closed',
        upcoming: 'Upcoming',
        completed: 'Completed',
        published: 'Published',
        pending: 'Pending',
        active: 'Active',
        inactive: 'Inactive',
        paid: 'Paid',
        unpaid: 'Unpaid',
      },
    },
  },
  dz: {
    // NOTE: Dzongkha translations below are placeholders.
    // All strings marked [dz] require review by a certified Dzongkha linguist.
    translation: {
      app: {
        title: 'རྫོང་འཇུག',
        subtitle: 'རྫོང་ཁ་ཚད་ལྡན་ཡིག་རྒྱུགས་རིམ་ལུགས།',
      },
      nav: {
        dashboard: 'ལྟེ་གནས།',
        user_management: '[dz] User Management',
        role_management: '[dz] Role Management',
        master_settings: '[dz] Master Settings',
        reports: '[dz] Reports',
        exam_windows: '[dz] Exam Windows',
        applications: '[dz] Applications',
        verification: '[dz] Verification',
        attendance: '[dz] Attendance',
        band_scores: '[dz] Band Scores',
        certificates: '[dz] Certificates',
        appeals: '[dz] Appeals',
        question_papers: '[dz] Question Papers',
        sample_papers: '[dz] Sample Papers',
        sign_out: '[dz] Sign Out',
        profile: '[dz] Profile',
        settings: '[dz] Settings',
        notifications: '[dz] Notifications',
      },
      header: {
        switch_role: '[dz] Switch Demo Role',
        profile: '[dz] Profile',
        settings: '[dz] Settings',
      },
      common: {
        save: '[dz] Save',
        cancel: '[dz] Cancel',
        delete: '[dz] Delete',
        edit: '[dz] Edit',
        submit: '[dz] Submit',
        loading: '[dz] Loading…',
        search: '[dz] Search',
        filter: '[dz] Filter',
        export: '[dz] Export',
        view_all: '[dz] View All',
        no_data: '[dz] No data found',
        confirm: '[dz] Confirm',
        back: '[dz] Back',
      },
      status: {
        submitted: '[dz] Submitted',
        under_review: '[dz] Under Review',
        verified: '[dz] Verified',
        approved: '[dz] Approved',
        returned: '[dz] Returned',
        rejected: '[dz] Rejected',
        absent: '[dz] Absent',
        open: '[dz] Open',
        closed: '[dz] Closed',
        upcoming: '[dz] Upcoming',
        completed: '[dz] Completed',
        published: '[dz] Published',
        pending: '[dz] Pending',
        active: '[dz] Active',
        inactive: '[dz] Inactive',
        paid: '[dz] Paid',
        unpaid: '[dz] Unpaid',
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'dsts_language',
    },
  });

export default i18n;
