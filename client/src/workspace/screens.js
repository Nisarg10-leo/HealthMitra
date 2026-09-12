import { AlertsPage } from '../features/alerts/AlertsPage.jsx';
import { ContactsPage } from '../features/contacts/ContactsPage.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { HistoryPage } from '../features/history/HistoryPage.jsx';
import { MedicinesPage } from '../features/medications/MedicinesPage.jsx';
import { SymptomsPage } from '../features/symptoms/SymptomsPage.jsx';
import { TodayPage } from '../features/today/TodayPage.jsx';
import { ProfilePage } from '../features/profile/ProfilePage.jsx';

// Tab id -> screen component. The shell never imports a feature directly.
export const SCREENS = {
  today: TodayPage,
  dashboard: DashboardPage,
  medications: MedicinesPage,
  history: HistoryPage,
  alerts: AlertsPage,
  symptoms: SymptomsPage,
  contacts: ContactsPage,
  profile: ProfilePage
};
