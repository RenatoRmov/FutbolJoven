-- AlterTable
ALTER TABLE "Injury" ADD COLUMN "injuryType" TEXT;
ALTER TABLE "Injury" ADD COLUMN "responsibleProfessional" TEXT;
ALTER TABLE "Injury" ADD COLUMN "treatment" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "busDepartureTime" TEXT;
ALTER TABLE "Match" ADD COLUMN "city" TEXT;
ALTER TABLE "Match" ADD COLUMN "hotelNameAddress" TEXT;
ALTER TABLE "Match" ADD COLUMN "meetingPoint" TEXT;
ALTER TABLE "Match" ADD COLUMN "playersArrivalTime" TEXT;
ALTER TABLE "Match" ADD COLUMN "techStaffArrivalTime" TEXT;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "address" TEXT;
ALTER TABLE "Player" ADD COLUMN "allergies" TEXT;
ALTER TABLE "Player" ADD COLUMN "bloodType" TEXT;
ALTER TABLE "Player" ADD COLUMN "chronicDiseases" TEXT;
ALTER TABLE "Player" ADD COLUMN "email" TEXT;
ALTER TABLE "Player" ADD COLUMN "emergencyContactAddress" TEXT;
ALTER TABLE "Player" ADD COLUMN "emergencyContactName" TEXT;
ALTER TABLE "Player" ADD COLUMN "emergencyContactPhone" TEXT;
ALTER TABLE "Player" ADD COLUMN "emergencyContactPhoneAlt" TEXT;
ALTER TABLE "Player" ADD COLUMN "emergencyContactRelationship" TEXT;
ALTER TABLE "Player" ADD COLUMN "fonasaTramo" TEXT;
ALTER TABLE "Player" ADD COLUMN "healthSystem" TEXT;
ALTER TABLE "Player" ADD COLUMN "isapreName" TEXT;
ALTER TABLE "Player" ADD COLUMN "medicalObservations" TEXT;
ALTER TABLE "Player" ADD COLUMN "permanentMedications" TEXT;
ALTER TABLE "Player" ADD COLUMN "phone" TEXT;
ALTER TABLE "Player" ADD COLUMN "relevantPreviousInjuries" TEXT;
