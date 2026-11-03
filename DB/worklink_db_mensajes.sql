
CREATE TABLE IF NOT EXISTS mensajes (
    id_mensaje INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_solicitud INT(10) UNSIGNED NOT NULL,
    id_remitente INT(10) UNSIGNED NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_mensaje),

    INDEX idx_mensajes_solicitud_fecha (
        id_solicitud,
        fecha_envio
    ),

    INDEX idx_mensajes_remitente (id_remitente),

    CONSTRAINT fk_mensajes_solicitud
        FOREIGN KEY (id_solicitud)
        REFERENCES solicitudes(id_solicitud)
        ON DELETE CASCADE,

    CONSTRAINT fk_mensajes_remitente
        FOREIGN KEY (id_remitente)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
