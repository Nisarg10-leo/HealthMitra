import { AlertsPage } from '../features/alerts/AlertsPage.jsx';
import { CaregiverPage } from '../features/caregiver/CaregiverPage.jsx';
import { ContactsPage } from '../features/contacts/ContactsPage.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { HistoryPage } from '../features/history/HistoryPage.jsx';
import { MedicinesPage } from '../features/medications/MedicinesPage.jsx';
import { PatientPage } from '../features/patient/PatientPage.jsx';
import { ProfilePage } from '../features/profile/ProfilePage.jsx';
import { SymptomsPage } from '../features/symptoms/SymptomsPage.jsx';
import { TodayPage } from '../features/today/TodayPage.jsx';

// Tab id -> screen component. The shell never imports a feature directly.
export const SCREENS = {
  today: TodayPage,
  dashboard: DashboardPage,
  caregiver: CaregiverPage,
  patient: PatientPage,
  medications: MedicinesPage,
  history: HistoryPage,
  alerts: AlertsPage,
  symptoms: SymptomsPage,
  contacts: ContactsPage,
  profile: ProfilePage
};
