-- ==========================================================
-- ESTRUCTURA COMPLETA DEL MODELO DE DATOS (POSTGRESQL)
-- ==========================================================
-- Adaptado a los cambios recientes:
--   - reemplazo de nombre_limpio → etiqueta_producto
--   - nueva tabla dim_subcategoria
--   - relaciones entre categorías y subcategorías
-- ==========================================================

-- ==========================================================
-- LIMPIEZA PREVIA (opcional al regenerar)
-- ==========================================================
DROP TABLE IF EXISTS hechos_precios CASCADE;
DROP TABLE IF EXISTS dim_producto CASCADE;
DROP TABLE IF EXISTS dim_subcategoria CASCADE;
DROP TABLE IF EXISTS dim_marca CASCADE;
DROP TABLE IF EXISTS dim_categoria CASCADE;
DROP TABLE IF EXISTS dim_cadena CASCADE;
DROP TABLE IF EXISTS dim_unidad_medida CASCADE;

-- ==========================================================
-- DIMENSIONES
-- ==========================================================

CREATE TABLE dim_marca (
    id_marca SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE dim_categoria (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE dim_cadena (
    id_cadena SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE dim_unidad_medida (
    id_unidad_medida SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE
);

-- ==========================================================
-- NUEVA TABLA: DIM_SUBCATEGORIA
-- ==========================================================
CREATE TABLE dim_subcategoria (
    id_subcategoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL
);

-- ==========================================================
-- PRODUCTOS
-- ==========================================================
CREATE TABLE dim_producto (
    id_producto SERIAL PRIMARY KEY,
    nombre_original VARCHAR(255) NOT NULL,
    etiqueta_producto VARCHAR(255),       
    volumen NUMERIC(10,3),
    url VARCHAR(255) UNIQUE NOT NULL,
    create_at DATE DEFAULT CURRENT_DATE,
    update_at DATE DEFAULT CURRENT_DATE,

    id_categoria INTEGER NOT NULL REFERENCES dim_categoria(id_categoria) ON DELETE SET DEFAULT,
    id_unidad_medida INTEGER NOT NULL REFERENCES dim_unidad_medida(id_unidad_medida) ON DELETE SET DEFAULT,
    id_marca INTEGER NOT NULL REFERENCES dim_marca(id_marca) ON DELETE SET DEFAULT,
    id_cadena INTEGER NOT NULL REFERENCES dim_cadena(id_cadena),
    id_subcategoria INTEGER REFERENCES dim_subcategoria(id_subcategoria) ON DELETE SET DEFAULT
);

-- ==========================================================
-- HECHOS (PRECIOS HISTÓRICOS)
-- ==========================================================
CREATE TABLE hechos_precios (
    id_hecho SERIAL PRIMARY KEY,
    id_producto INTEGER NOT NULL REFERENCES dim_producto(id_producto),
    precio_normal NUMERIC(12,2),
    precio_oferta NUMERIC(12,2),
    precio_medio_pago NUMERIC(12,2),
    promo VARCHAR(255),
    badge VARCHAR(255),
    create_at DATE DEFAULT CURRENT_DATE,
    updated_at DATE DEFAULT CURRENT_DATE
);

-- ==========================================================
-- ÍNDICES Y OPTIMIZACIÓN
-- ==========================================================
CREATE INDEX idx_hechos_producto_fecha ON hechos_precios(id_producto, create_at);
CREATE INDEX idx_producto_categoria ON dim_producto(id_categoria);
CREATE INDEX idx_producto_subcategoria ON dim_producto(id_subcategoria);
CREATE INDEX idx_producto_etiqueta ON dim_producto(etiqueta_producto);

