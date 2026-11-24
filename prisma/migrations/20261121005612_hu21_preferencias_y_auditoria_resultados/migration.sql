-- CreateTable
CREATE TABLE "preferencias_notificacion" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "categoria" "NotificationCategory" NOT NULL DEFAULT 'INSCRIPCIONES',
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "preferencias_notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditorias_resultado" (
    "id" UUID NOT NULL,
    "partido_id" UUID NOT NULL,
    "organizador_id" UUID NOT NULL,
    "eventos_antes" JSONB NOT NULL,
    "eventos_despues" JSONB NOT NULL,
    "justificacion" VARCHAR(300) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditorias_resultado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "preferencias_notificacion_user_id_categoria_key" ON "preferencias_notificacion"("user_id", "categoria");

-- CreateIndex
CREATE INDEX "auditorias_resultado_partido_id_idx" ON "auditorias_resultado"("partido_id");

-- CreateIndex
CREATE INDEX "auditorias_resultado_organizador_id_idx" ON "auditorias_resultado"("organizador_id");

-- AddForeignKey
ALTER TABLE "preferencias_notificacion" ADD CONSTRAINT "preferencias_notificacion_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditorias_resultado" ADD CONSTRAINT "auditorias_resultado_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditorias_resultado" ADD CONSTRAINT "auditorias_resultado_organizador_id_fkey" FOREIGN KEY ("organizador_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
