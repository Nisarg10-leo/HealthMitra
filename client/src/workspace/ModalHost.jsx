import { AskMitraModal } from '../components/ui/AskMitraModal.jsx';
import { EmergencyQrModal } from '../components/ui/EmergencyQrModal.jsx';
import { PillVerificationModal } from '../components/ui/PillVerificationModal.jsx';
import { ContactFormModal } from '../features/contacts/ContactFormModal.jsx';
import { JoinModal } from '../features/linking/JoinModal.jsx';
import { LinkCaregiverModal } from '../features/linking/LinkCaregiverModal.jsx';
import { MedicineFormModal } from '../features/medications/MedicineFormModal.jsx';
import { SosModal } from '../features/sos/SosModal.jsx';

// Registry of dialogs by `kind`. Adding a dialog = one import + one entry.
const MODALS = {
  sos: SosModal,
  join: JoinModal,
  link: LinkCaregiverModal,
  medicine: MedicineFormModal,
  contact: ContactFormModal,
  askMitra: AskMitraModal,
  emergencyQr: EmergencyQrModal,
  pillVerify: PillVerificationModal
};

export function ModalHost({ modal, onClose }) {
  if (!modal) return null;
  const Component = MODALS[modal.kind];
  return Component ? <Component {...modal} onClose={onClose} /> : null;
}
