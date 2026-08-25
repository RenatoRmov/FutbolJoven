/**
 * Player eligibility / registration document checklist. Seeded from the
 * real document list a formative-football club requires for federation
 * registration (ANFP-style) — includes the extended checklist required
 * specifically for foreign-born minors (international transfer protocol).
 */

export type DocumentCategory = "INGRESO" | "SALIDA" | "INTERNACIONAL";

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  INGRESO: "Documentación de ingreso",
  SALIDA: "Documentación de salida / traspaso",
  INTERNACIONAL: "Protocolo de inmigración (jugadores extranjeros)",
};

export interface DefaultDocumentType {
  key: string;
  name: string;
  category: DocumentCategory;
  isRequired: boolean;
  order: number;
}

export const DEFAULT_DOCUMENT_TYPES: DefaultDocumentType[] = [
  { key: "medical_cert", name: "Certificado médico (electrocardiograma basal)", category: "INGRESO", isRequired: true, order: 1 },
  { key: "school_cert", name: "Certificado de alumno regular / matrícula vigente", category: "INGRESO", isRequired: true, order: 2 },
  { key: "club_photo", name: "Fotografía oficial con camiseta del club", category: "INGRESO", isRequired: true, order: 3 },
  { key: "id_document", name: "Cédula de identidad / pasaporte (ambos lados)", category: "INGRESO", isRequired: true, order: 4 },
  { key: "notarial_permit", name: "Permiso notarial de padres o tutores", category: "INGRESO", isRequired: true, order: 5 },

  { key: "exit_tech_report", name: "Informe técnico de rendimiento final", category: "SALIDA", isRequired: true, order: 1 },
  { key: "release_letter", name: "Carta de libertad de acción del club", category: "SALIDA", isRequired: true, order: 2 },
  { key: "transfer_agreement", name: "Convenio / acuerdo de traspaso federativo", category: "SALIDA", isRequired: true, order: 3 },

  { key: "intl_school_cert", name: "Certificado de alumno regular vigente", category: "INTERNACIONAL", isRequired: true, order: 1 },
  { key: "intl_birth_cert", name: "Partida / certificado de nacimiento", category: "INTERNACIONAL", isRequired: true, order: 2 },
  { key: "intl_player_id", name: "Pasaporte y DNI del jugador", category: "INTERNACIONAL", isRequired: true, order: 3 },
  { key: "intl_parents_id", name: "Pasaporte / DNI de los padres", category: "INTERNACIONAL", isRequired: true, order: 4 },
  { key: "intl_residence_proof", name: "Comprobante de residencia de los padres", category: "INTERNACIONAL", isRequired: true, order: 5 },
  { key: "intl_work_permit", name: "Permiso de trabajo / visa de los padres", category: "INTERNACIONAL", isRequired: true, order: 6 },
  { key: "intl_work_contract", name: "Contrato de trabajo de los padres (o declaración jurada)", category: "INTERNACIONAL", isRequired: true, order: 7 },
  { key: "intl_first_registration_letter", name: "Carta del club solicitando primera inscripción", category: "INTERNACIONAL", isRequired: true, order: 8 },
  { key: "intl_first_contact_letter", name: "Carta del club: circunstancias y fecha del primer contacto", category: "INTERNACIONAL", isRequired: true, order: 9 },
  { key: "intl_transfer_request", name: "Carta de solicitud de transferencia internacional", category: "INTERNACIONAL", isRequired: false, order: 10 },
];
