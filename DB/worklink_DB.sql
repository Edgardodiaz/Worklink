-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: worklink_db
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- =====================================================
-- WORKLINK
-- Base de datos para una plataforma de servicios
-- =====================================================

CREATE DATABASE IF NOT EXISTS worklink_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE worklink_db;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id_categoria` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_categoria`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES (1,'Electricidad','Instalaciones y reparaciones eléctricas',1),(2,'Fontanería','Tuberías, fugas e instalaciones de agua',1),(3,'Albañilería','Construcción y reparación de estructuras',1),(4,'Tecnología','Soporte técnico, computadoras y redes',1),(5,'Aire acondicionado','Instalación y mantenimiento de climatización',1),(6,'Reparaciones del hogar','Mantenimiento y arreglos generales',1);
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `favoritos`
--

DROP TABLE IF EXISTS `favoritos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `favoritos` (
  `id_cliente` int(10) unsigned NOT NULL,
  `id_perfil` int(10) unsigned NOT NULL,
  `fecha_guardado` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_cliente`,`id_perfil`),
  KEY `fk_favorito_perfil` (`id_perfil`),
  CONSTRAINT `fk_favorito_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_favorito_perfil` FOREIGN KEY (`id_perfil`) REFERENCES `perfiles_profesionales` (`id_perfil`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favoritos`
--

LOCK TABLES `favoritos` WRITE;
/*!40000 ALTER TABLE `favoritos` DISABLE KEYS */;
/*!40000 ALTER TABLE `favoritos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `perfiles_profesionales`
--

DROP TABLE IF EXISTS `perfiles_profesionales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `perfiles_profesionales` (
  `id_perfil` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_usuario` int(10) unsigned NOT NULL,
  `titulo_profesional` varchar(120) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `anios_experiencia` tinyint(3) unsigned DEFAULT 0,
  `tarifa_base` decimal(10,2) DEFAULT NULL,
  `departamento` varchar(100) DEFAULT NULL,
  `municipio` varchar(100) DEFAULT NULL,
  `direccion_referencia` varchar(255) DEFAULT NULL,
  `foto_url` varchar(500) DEFAULT NULL,
  `disponible` tinyint(1) NOT NULL DEFAULT 1,
  `verificado` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_perfil`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `fk_perfil_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `chk_tarifa_base` CHECK (`tarifa_base` is null or `tarifa_base` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `perfiles_profesionales`
--

LOCK TABLES `perfiles_profesionales` WRITE;
/*!40000 ALTER TABLE `perfiles_profesionales` DISABLE KEYS */;
/*!40000 ALTER TABLE `perfiles_profesionales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resenas`
--

DROP TABLE IF EXISTS `resenas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resenas` (
  `id_resena` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_solicitud` int(10) unsigned NOT NULL,
  `puntuacion` tinyint(3) unsigned NOT NULL,
  `comentario` text DEFAULT NULL,
  `fecha_resena` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_resena`),
  UNIQUE KEY `id_solicitud` (`id_solicitud`),
  CONSTRAINT `fk_resena_solicitud` FOREIGN KEY (`id_solicitud`) REFERENCES `solicitudes` (`id_solicitud`),
  CONSTRAINT `chk_puntuacion` CHECK (`puntuacion` between 1 and 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resenas`
--

LOCK TABLES `resenas` WRITE;
/*!40000 ALTER TABLE `resenas` DISABLE KEYS */;
/*!40000 ALTER TABLE `resenas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `servicios`
--

DROP TABLE IF EXISTS `servicios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicios` (
  `id_servicio` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_perfil` int(10) unsigned NOT NULL,
  `id_categoria` int(10) unsigned NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio_desde` decimal(10,2) DEFAULT NULL,
  `tipo_precio` enum('fijo','por_hora','cotizacion') NOT NULL DEFAULT 'cotizacion',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_servicio`),
  KEY `idx_servicios_categoria` (`id_categoria`),
  KEY `idx_servicios_perfil` (`id_perfil`),
  CONSTRAINT `fk_servicio_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id_categoria`),
  CONSTRAINT `fk_servicio_perfil` FOREIGN KEY (`id_perfil`) REFERENCES `perfiles_profesionales` (`id_perfil`),
  CONSTRAINT `chk_precio_servicio` CHECK (`precio_desde` is null or `precio_desde` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `servicios`
--

LOCK TABLES `servicios` WRITE;
/*!40000 ALTER TABLE `servicios` DISABLE KEYS */;
/*!40000 ALTER TABLE `servicios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes`
--

DROP TABLE IF EXISTS `solicitudes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes` (
  `id_solicitud` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `id_cliente` int(10) unsigned NOT NULL,
  `id_servicio` int(10) unsigned NOT NULL,
  `descripcion_problema` text NOT NULL,
  `departamento` varchar(100) NOT NULL,
  `municipio` varchar(100) NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `fecha_preferida` datetime DEFAULT NULL,
  `presupuesto` decimal(10,2) DEFAULT NULL,
  `estado` enum('pendiente','aceptada','rechazada','en_proceso','completada','cancelada') NOT NULL DEFAULT 'pendiente',
  `fecha_solicitud` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_solicitud`),
  KEY `fk_solicitud_servicio` (`id_servicio`),
  KEY `idx_solicitudes_cliente` (`id_cliente`),
  KEY `idx_solicitudes_estado` (`estado`),
  CONSTRAINT `fk_solicitud_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `fk_solicitud_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicios` (`id_servicio`),
  CONSTRAINT `chk_presupuesto` CHECK (`presupuesto` is null or `presupuesto` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes`
--

LOCK TABLES `solicitudes` WRITE;
/*!40000 ALTER TABLE `solicitudes` DISABLE KEYS */;
/*!40000 ALTER TABLE `solicitudes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuario` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `apellido` varchar(80) NOT NULL,
  `correo` varchar(150) NOT NULL,
  `contrasena_hash` varchar(255) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `tipo_cuenta` enum('cliente','profesional','ambos','administrador') NOT NULL DEFAULT 'cliente',
  `estado` enum('activo','inactivo','suspendido') NOT NULL DEFAULT 'activo',
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Aristides','Diaz','aris@gmail.com','$2b$12$aZ0Q2WRKyEugXxP9sSKpM.ZDJyk0lWoXT1LLF2HIRzklLdxdvhsoC',NULL,'ambos','activo','2026-10-23 23:57:37');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-23 18:09:33
