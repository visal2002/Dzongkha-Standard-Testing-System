/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

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
      home: {
        nav_home: 'Home',
        nav_about: 'About DSTs',
        nav_contact: 'Contact Us',
        sign_in: 'Sign In',
        hero_title_line1: 'Dzongkha Standard',
        hero_title_line2: 'Testing System',
        hero_subtitle:
          "Bhutan's premier national platform for standardized Dzongkha language proficiency assessment, official certificate management, and secure examination administration.",
        cta_access_portal: 'Access Portal',
        cta_ndi: 'Sign in with NDI',
        feature_registration_title: 'Online Registration',
        feature_registration_desc: 'Apply for DSTS examinations online with secure document submission',
        feature_certificates_title: 'Digital Certificates',
        feature_certificates_desc: 'Secure, QR-verified certificates with official CEFR band scores',
        feature_secure_title: 'Secure & Transparent',
        feature_secure_desc: 'Role-based access, comprehensive audit trails, and NDI authentication',
        footer_copyright:
          '© 2026 Department of Culture and Dzongkha Development, Ministry of Home Affairs, Bhutan',
        footer_developed: 'Developed by GovTech · Secured by NDI',
        footer_department: 'Department of Culture and Dzongkha Development, Bhutan',
        lang_toggle_label: 'Switch language',
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
      home: {
        nav_home: 'མདུན་ངོས།',
        nav_about: 'རྫོང་ཁ་ཚད་ལྡན་ཡིག་རྒྱུགས་ཀྱི་སྐོར།',
        nav_contact: 'འབྲེལ་བ་འཐབ་ས།',
        sign_in: 'ནང་བསྐྱོད།',
        hero_title_line1: 'རྫོང་ཁ་ཚད་ལྡན་',
        hero_title_line2: 'ཡིག་རྒྱུགས་རིམ་ལུགས།',
        hero_subtitle:
          'འབྲུག་གི་རྒྱལ་ཡོངས་གཙོ་བོའི་མཉེན་ཆས་ཅིག་ཨིན། རྫོང་ཁའི་སྐད་ཡིག་ལྕོགས་གྲུབ་ཚད་ལྡན་བརྟག་དཔྱད་དང་། ངོ་སྦྱོར་ལག་ཁྱེར་གྱི་འཛིན་སྐྱོང་། ཉེན་སྲུང་ལྡན་པའི་ཡིག་རྒྱུགས་འཛིན་སྐྱོང་བཅས་ཀྱི་དོན་ལུ།',
        cta_access_portal: 'སྒོ་ར་ནང་བསྐྱོད།',
        cta_ndi: 'NDI ཐོག་ལས་ནང་བསྐྱོད།',
        feature_registration_title: 'ཨིན་ལ་ཡིན་ཐོག་ཐོ་བཀོད།',
        feature_registration_desc: 'ཡིག་ཆ་ཉེན་སྲུང་ལྡན་པའི་ཐོག་ལས་ ཨིན་ལ་ཡིན་ཐོག་ལས་ DSTS ཡིག་རྒྱུགས་ཀྱི་དོན་ལུ་ཞུ་ཡིག་ཕུལ།',
        feature_certificates_title: 'ཌི་ཇི་ཊཱལ་ལག་ཁྱེར།',
        feature_certificates_desc: ' CEFR ཚད་གཞིའི་སྐུགས་གྲངས་དང་བཅས་པའི་ QR ར་སྤྲོད་འབད་ཡོད་པའི་ ཉེན་སྲུང་ལག་ཁྱེར།',
        feature_secure_title: 'ཉེན་སྲུང་དང་གསལ་སྟོན།',
        feature_secure_desc: 'ལས་འགན་གཞི་བཞག་གི་འཛུལ་སྤྱོད། ཞིབ་དཔྱད་ཐོ་ཡིག་ཡོངས་རྫོགས། NDI ར་སྤྲོད་བཅས།',
        footer_copyright:
          '© ༢༠༢༦ ནང་སྲིད་ལྷན་ཁག། རིག་གཞུང་དང་རྫོང་ཁ་གོང་འཕེལ་ལས་ཁུངས། འབྲུག།',
        footer_developed: 'GovTech གིས་བཟོ་བསྐྲུན་འབད། NDI གིས་ཉེན་སྲུང་འབད།',
        footer_department: 'རིག་གཞུང་དང་རྫོང་ཁ་གོང་འཕེལ་ལས་ཁུངས། འབྲུག།',
        lang_toggle_label: 'སྐད་ཡིག་བརྗེ་སྒྱུར།',
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
