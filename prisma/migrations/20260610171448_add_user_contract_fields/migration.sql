-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "companyAddress" TEXT,
ADD COLUMN     "companyCEP" TEXT,
ADD COLUMN     "companyCity" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companyState" CHAR(2),
ADD COLUMN     "cpf" TEXT;
