-- ============================================================
-- Dulcería Lupita — Base de datos corregida
-- Versión corregida: 2026-05-21
-- Servidor: MySQL 8.x
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- ─── Base de datos ──────────────────────────────────────────
-- Usar la BD existente o crearla
CREATE DATABASE IF NOT EXISTS `dulceria_lupitabd`
  DEFAULT CHARACTER SET utf8mb3
  COLLATE utf8mb3_spanish_ci;
USE `dulceria_lupitabd`;

-- ============================================================
-- PROCEDIMIENTOS ALMACENADOS
-- ============================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS `productos_bajo_stock`$$
CREATE PROCEDURE `productos_bajo_stock` (IN `stock_minimo` INT)
BEGIN
    SELECT ID_producto, Nombre, Stock_anual, Precio_unitario
    FROM productos
    WHERE Stock_anual <= stock_minimo
    ORDER BY Stock_anual ASC;
END$$

DROP PROCEDURE IF EXISTS `productos_proximos_a_caducar`$$
CREATE PROCEDURE `productos_proximos_a_caducar` (IN `dias_anticipacion` INT)
BEGIN
    SELECT
        ID_producto, Nombre, Stock_anual, Fecha_caducidad,
        DATEDIFF(Fecha_caducidad, CURDATE()) AS Dias_restantes
    FROM productos
    WHERE Fecha_caducidad IS NOT NULL
      AND Fecha_caducidad <= DATE_ADD(CURDATE(), INTERVAL dias_anticipacion DAY)
      AND Fecha_caducidad >= CURDATE()
    ORDER BY Fecha_caducidad ASC;
END$$

DELIMITER ;

-- ============================================================
-- TABLAS (orden respetando dependencias FK)
-- ============================================================

-- ── unidad_medida ────────────────────────────────────────────
DROP TABLE IF EXISTS `unidad_medida`;
CREATE TABLE `unidad_medida` (
  `ID_unidad`     int          NOT NULL AUTO_INCREMENT,
  `Unidad_medida` varchar(50)  COLLATE utf8mb3_spanish_ci NOT NULL,
  `Tipo_unidad`   varchar(50)  COLLATE utf8mb3_spanish_ci NOT NULL,
  PRIMARY KEY (`ID_unidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

INSERT INTO `unidad_medida` VALUES
(1,'Pieza','Unidad'),(2,'Docena','Unidad'),(3,'Par','Unidad'),
(4,'Caja','Unidad'),(5,'Unidades','Unidad'),
(6,'Kilogramo (kg)','Peso'),(7,'Gramo (g)','Peso'),
(8,'Miligramo (mg)','Peso'),(9,'Tonelada','Peso'),
(10,'Libra','Peso'),(11,'Onza','Peso'),
(12,'Litro (l)','Volumen'),(13,'Mililitro (ml)','Volumen'),
(14,'Centímetro cúbico','Volumen'),(15,'Galón','Volumen'),
(16,'Onza líquida','Volumen');

-- ── categorias ───────────────────────────────────────────────
-- CORRECCIÓN 7: Descripcion era NOT NULL → cambiado a DEFAULT ''
DROP TABLE IF EXISTS `categorias`;
CREATE TABLE `categorias` (
  `ID_categoria`    int          NOT NULL AUTO_INCREMENT,
  `Nombre_categoria` varchar(100) COLLATE utf8mb3_spanish_ci NOT NULL,
  `Descripcion`     varchar(255) COLLATE utf8mb3_spanish_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`ID_categoria`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

INSERT INTO `categorias` (`ID_categoria`, `Nombre_categoria`, `Descripcion`) VALUES
(1, 'Higiene', 'Productos para el cuidado personal'),
(2, 'Dulces', 'Dulces, caramelos y gomitas'),
(3, 'Chocolates', 'Chocolates y derivados'),
(4, 'Botanas', 'Frituras y botanas'),
(5, 'Bebidas', 'Refrescos y jugos');

-- ── usuarios ─────────────────────────────────────────────────
-- CORRECCIÓN 1: Agregado AUTO_INCREMENT en ID_usuario
-- CORRECCIÓN 2: UNIQUE KEY movida a Correo (no a contraseña_hash)
-- CORRECCIÓN 3: contraseña_hash ampliado de VARCHAR(50) a VARCHAR(255)
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `ID_usuario`      int          NOT NULL AUTO_INCREMENT,
  `Nombre`          varchar(100) COLLATE utf8mb3_spanish_ci NOT NULL,
  `Rol`             varchar(100) COLLATE utf8mb3_spanish_ci NOT NULL,
  `Correo`          varchar(150) COLLATE utf8mb3_spanish_ci NOT NULL,
  `contraseña_hash` varchar(255) COLLATE utf8mb3_spanish_ci NOT NULL,
  PRIMARY KEY (`ID_usuario`),
  UNIQUE KEY `uq_correo` (`Correo`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

-- CUENTA DUEÑA para pruebas (contraseña: lupita2024)
-- CUENTA Administrativo existente (contraseña: 123)
INSERT INTO `usuarios` (`ID_usuario`, `Nombre`, `Rol`, `Correo`, `contraseña_hash`) VALUES
(1, 'Juan Perez',    'Administrativo', 'juan@perez.com',       '123'),
(2, 'Lupita Dueña',  'Dueña',          'lupita@dulceria.com',  'lupita2024');

-- ── sucursal ─────────────────────────────────────────────────
DROP TABLE IF EXISTS `sucursal`;
CREATE TABLE `sucursal` (
  `ID_sucursal` int          NOT NULL AUTO_INCREMENT,
  `Nombre`      varchar(100) COLLATE utf8mb3_spanish_ci NOT NULL,
  `Contacto`    varchar(100) COLLATE utf8mb3_spanish_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`ID_sucursal`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

INSERT INTO `sucursal` VALUES (1, 'Dulcería Lupita Central', '123');

-- ── proveedores ──────────────────────────────────────────────
DROP TABLE IF EXISTS `proveedores`;
CREATE TABLE `proveedores` (
  `RFC`       varchar(13)  COLLATE utf8mb3_spanish_ci NOT NULL,
  `Nombre`    varchar(150) COLLATE utf8mb3_spanish_ci NOT NULL,
  `Contacto`  varchar(100) COLLATE utf8mb3_spanish_ci NOT NULL DEFAULT '',
  `Telefono`  varchar(20)  COLLATE utf8mb3_spanish_ci NOT NULL DEFAULT '',
  `Direccion` varchar(200) COLLATE utf8mb3_spanish_ci NOT NULL DEFAULT '',
  `Gmail`     varchar(100) COLLATE utf8mb3_spanish_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`RFC`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

INSERT INTO `proveedores` VALUES ('DOV123456ABC','Dove','San Nic','12345','San Nic','');

-- ── productos ────────────────────────────────────────────────
-- CORRECCIÓN 6: Columnas Foto, Ubicacion, Foto_ubicacion integradas aquí
--               (antes estaban después del COMMIT, fuera de la transacción)
DROP TABLE IF EXISTS `productos`;
CREATE TABLE `productos` (
  `ID_producto`     int            NOT NULL AUTO_INCREMENT,
  `Nombre`          varchar(100)   COLLATE utf8mb3_spanish_ci NOT NULL,
  `Descripcion`     varchar(255)   COLLATE utf8mb3_spanish_ci NOT NULL DEFAULT '',
  `ID_categoria`    int            NOT NULL,
  `ID_unidad`       int            NOT NULL,
  `Stock_anual`     int            NOT NULL DEFAULT 0,
  `Stock_minimo`    int            NOT NULL DEFAULT 0,
  `Precio_unitario` decimal(10,2)  NOT NULL DEFAULT 0.00,
  `Fecha_caducidad` date           DEFAULT NULL,
  `Foto`            varchar(255)   DEFAULT NULL COMMENT 'Ruta imagen del producto',
  `Ubicacion`       varchar(255)   DEFAULT NULL COMMENT 'Ubicación física en almacén',
  `Foto_ubicacion`  varchar(255)   DEFAULT NULL COMMENT 'Foto de la ubicación en almacén',
  PRIMARY KEY (`ID_producto`),
  KEY `ID_categoria` (`ID_categoria`),
  KEY `ID_unidad`    (`ID_unidad`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

INSERT INTO `productos`
  (`ID_producto`,`Nombre`,`Descripcion`,`ID_categoria`,`ID_unidad`,`Stock_anual`,`Stock_minimo`,`Precio_unitario`,`Fecha_caducidad`)
VALUES
  (1,'Jabón Líquido','Jabón para manos marca Dove',1,1,50,5,25.00,NULL);

-- ── detalle_producto ─────────────────────────────────────────
DROP TABLE IF EXISTS `detalle_producto`;
CREATE TABLE `detalle_producto` (
  `ID_detalle_producto`  int           NOT NULL AUTO_INCREMENT,
  `ID_producto`          int           NOT NULL,
  `RFC_proveedor`        varchar(13)   COLLATE utf8mb3_spanish_ci NOT NULL,
  `precio_compra`        decimal(10,2) NOT NULL,
  `fecha_ultima_compra`  date          NOT NULL,
  PRIMARY KEY (`ID_detalle_producto`),
  KEY `ID_producto`   (`ID_producto`),
  KEY `RFC_proveedor` (`RFC_proveedor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

-- ── ajustes_inventario ───────────────────────────────────────
-- Incluye RFC_proveedor, ID_sucursal y Estado para soporte completo de devoluciones
DROP TABLE IF EXISTS `ajustes_inventario`;
CREATE TABLE `ajustes_inventario` (
  `ID_ajuste`         int          NOT NULL AUTO_INCREMENT,
  `ID_producto`       int          NOT NULL,
  `Cantidad_ajustada` int          NOT NULL,
  `Motivo`            varchar(200) COLLATE utf8mb3_spanish_ci NOT NULL,
  `Fecha_ajuste`      date         NOT NULL,
  `ID_usuario`        int          NOT NULL,
  `RFC_proveedor`     varchar(13)  COLLATE utf8mb3_spanish_ci DEFAULT NULL,
  `ID_sucursal`       int          DEFAULT NULL,
  `Estado`            varchar(60)  COLLATE utf8mb3_spanish_ci NOT NULL DEFAULT 'Registrada',
  PRIMARY KEY (`ID_ajuste`),
  KEY `ID_producto`   (`ID_producto`),
  KEY `ID_usuario`    (`ID_usuario`),
  KEY `RFC_proveedor` (`RFC_proveedor`),
  KEY `ID_sucursal`   (`ID_sucursal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

-- ── alertas_stock ────────────────────────────────────────────
DROP TABLE IF EXISTS `alertas_stock`;
CREATE TABLE `alertas_stock` (
  `ID_alerta`     int         NOT NULL AUTO_INCREMENT,
  `ID_producto`   int         NOT NULL,
  `Stock_minimo`  int         NOT NULL,
  `Stock_maximo`  int         NOT NULL,
  `Estado_alerta` varchar(60) COLLATE utf8mb3_spanish_ci NOT NULL DEFAULT 'Activa',
  PRIMARY KEY (`ID_alerta`),
  KEY `ID_producto` (`ID_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

-- ── entradas ─────────────────────────────────────────────────
DROP TABLE IF EXISTS `entradas`;
CREATE TABLE `entradas` (
  `ID_entrada`    int           NOT NULL AUTO_INCREMENT,
  `Fecha_entrada` date          NOT NULL,
  `ID_producto`   int           NOT NULL,
  `Cantidad`      int           NOT NULL,
  `Costo_unitario` decimal(10,2) NOT NULL,
  `RFC_proveedor` varchar(13)   COLLATE utf8mb3_spanish_ci NOT NULL,
  `ID_usuario`    int           NOT NULL,
  PRIMARY KEY (`ID_entrada`),
  KEY `ID_producto`   (`ID_producto`),
  KEY `RFC_proveedor` (`RFC_proveedor`),
  KEY `ID_usuario`    (`ID_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

INSERT INTO `entradas` VALUES (1,'2026-01-23',1,5,20.00,'DOV123456ABC',1);

-- ── salidas ──────────────────────────────────────────────────
DROP TABLE IF EXISTS `salidas`;
CREATE TABLE `salidas` (
  `ID_salida`   int  NOT NULL AUTO_INCREMENT,
  `Fecha_salida` date NOT NULL,
  `ID_producto` int  NOT NULL,
  `Cantidad`    int  NOT NULL,
  `ID_sucursal` int  NOT NULL,
  `ID_usuario`  int  NOT NULL,
  PRIMARY KEY (`ID_salida`),
  KEY `ID_producto` (`ID_producto`),
  KEY `ID_sucursal` (`ID_sucursal`),
  KEY `ID_usuario`  (`ID_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

-- ── inventario_inicial ───────────────────────────────────────
DROP TABLE IF EXISTS `inventario_inicial`;
CREATE TABLE `inventario_inicial` (
  `ID_producto`     int  NOT NULL,
  `Cantidad_inicial` int  NOT NULL,
  `Fecha_registro`  date NOT NULL,
  KEY `ID_producto` (`ID_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

-- ── movimientos ──────────────────────────────────────────────
DROP TABLE IF EXISTS `movimientos`;
CREATE TABLE `movimientos` (
  `ID_movimiento`   int          NOT NULL AUTO_INCREMENT,
  `ID_producto`     int          NOT NULL,
  `Cantidad`        int          NOT NULL,
  `Fecha_movimiento` date         NOT NULL,
  `Referencia`      varchar(100) COLLATE utf8mb3_spanish_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`ID_movimiento`),
  KEY `ID_producto` (`ID_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

-- ============================================================
-- TRIGGERS
-- ============================================================

DELIMITER $$

-- CORRECCIÓN 4: Trigger alertas_stock — reemplaza SET NULL por SIGNAL SQLSTATE
DROP TRIGGER IF EXISTS `trg_validar_stock_min_max`$$
CREATE TRIGGER `trg_validar_stock_min_max`
BEFORE INSERT ON `alertas_stock`
FOR EACH ROW
BEGIN
    IF NEW.Stock_maximo <= NEW.Stock_minimo THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El stock máximo debe ser mayor que el stock mínimo.';
    END IF;
END$$

-- CORRECCIÓN 5: Trigger salidas — reemplaza SET NULL por SIGNAL SQLSTATE
DROP TRIGGER IF EXISTS `trg_salida_validar_stock`$$
CREATE TRIGGER `trg_salida_validar_stock`
BEFORE INSERT ON `salidas`
FOR EACH ROW
BEGIN
    DECLARE stock_actual INT DEFAULT 0;
    SELECT Stock_anual INTO stock_actual
    FROM productos WHERE ID_producto = NEW.ID_producto;

    IF NEW.Cantidad <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'La cantidad de salida debe ser mayor a cero.';
    ELSEIF stock_actual < NEW.Cantidad THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Stock insuficiente para registrar la salida.';
    ELSE
        UPDATE productos
        SET Stock_anual = Stock_anual - NEW.Cantidad
        WHERE ID_producto = NEW.ID_producto;
    END IF;
END$$

-- Trigger entradas (sin cambios, estaba correcto)
DROP TRIGGER IF EXISTS `trg_entrada_actualiza_productos`$$
CREATE TRIGGER `trg_entrada_actualiza_productos`
AFTER INSERT ON `entradas`
FOR EACH ROW
BEGIN
    IF NEW.Cantidad > 0 THEN
        UPDATE productos
        SET Stock_anual = Stock_anual + NEW.Cantidad
        WHERE ID_producto = NEW.ID_producto;
    END IF;
END$$

DELIMITER ;

-- ============================================================
-- CLAVES FORÁNEAS
-- ============================================================

ALTER TABLE `ajustes_inventario`
  ADD CONSTRAINT `ajustes_inventario_ibfk_1` FOREIGN KEY (`ID_producto`)   REFERENCES `productos`   (`ID_producto`),
  ADD CONSTRAINT `ajustes_inventario_ibfk_2` FOREIGN KEY (`ID_usuario`)    REFERENCES `usuarios`    (`ID_usuario`),
  ADD CONSTRAINT `ajustes_inventario_ibfk_3` FOREIGN KEY (`RFC_proveedor`) REFERENCES `proveedores` (`RFC`),
  ADD CONSTRAINT `ajustes_inventario_ibfk_4` FOREIGN KEY (`ID_sucursal`)   REFERENCES `sucursal`    (`ID_sucursal`);

ALTER TABLE `alertas_stock`
  ADD CONSTRAINT `alertas_stock_ibfk_1` FOREIGN KEY (`ID_producto`) REFERENCES `productos` (`ID_producto`);

ALTER TABLE `detalle_producto`
  ADD CONSTRAINT `fk_detalle_producto`  FOREIGN KEY (`ID_producto`)  REFERENCES `productos`   (`ID_producto`),
  ADD CONSTRAINT `fk_detalle_proveedor` FOREIGN KEY (`RFC_proveedor`) REFERENCES `proveedores` (`RFC`);

ALTER TABLE `entradas`
  ADD CONSTRAINT `entradas_ibfk_1` FOREIGN KEY (`ID_producto`)   REFERENCES `productos`   (`ID_producto`),
  ADD CONSTRAINT `entradas_ibfk_2` FOREIGN KEY (`RFC_proveedor`) REFERENCES `proveedores` (`RFC`),
  ADD CONSTRAINT `entradas_ibfk_3` FOREIGN KEY (`ID_usuario`)    REFERENCES `usuarios`    (`ID_usuario`);

ALTER TABLE `inventario_inicial`
  ADD CONSTRAINT `inventario_inicial_ibfk_1` FOREIGN KEY (`ID_producto`) REFERENCES `productos` (`ID_producto`);

ALTER TABLE `movimientos`
  ADD CONSTRAINT `movimientos_ibfk_1` FOREIGN KEY (`ID_producto`) REFERENCES `productos` (`ID_producto`);

ALTER TABLE `productos`
  ADD CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`ID_categoria`) REFERENCES `categorias`   (`ID_categoria`),
  ADD CONSTRAINT `productos_ibfk_2` FOREIGN KEY (`ID_unidad`)    REFERENCES `unidad_medida` (`ID_unidad`);

ALTER TABLE `salidas`
  ADD CONSTRAINT `salidas_ibfk_1` FOREIGN KEY (`ID_producto`) REFERENCES `productos` (`ID_producto`),
  ADD CONSTRAINT `salidas_ibfk_2` FOREIGN KEY (`ID_sucursal`) REFERENCES `sucursal`  (`ID_sucursal`),
  ADD CONSTRAINT `salidas_ibfk_3` FOREIGN KEY (`ID_usuario`)  REFERENCES `usuarios`  (`ID_usuario`);

COMMIT;
