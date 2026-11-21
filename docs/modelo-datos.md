# Modelo de datos: Redis Cloud (Proyecto 2)

Se conservan las mismas tres entidades del dominio usadas en el Proyecto 1 y las imágenes enlazadas por `image_url`. Además, se incorpora una colección técnica `users` para JWT.

| Entidad | Clave Redis de ejemplo | Índice de IDs | Secuencia |
|---|---|---|---|
| Puentes | `catalog:v2:bridges:1` | `catalog:v2:index:bridges` | `catalog:v2:seq:bridges` |
| Países | `catalog:v2:countries:1` | `catalog:v2:index:countries` | `catalog:v2:seq:countries` |
| Tipos | `catalog:v2:bridge_types:1` | `catalog:v2:index:bridge_types` | `catalog:v2:seq:bridge_types` |
| Usuarios | `catalog:v2:users:id:1` | `catalog:v2:users:email:<correo>` (referencia a id) | `catalog:v2:users:seq` |

## Relaciones

`bridges.country_id → countries.id` y `bridges.bridge_type_id → bridge_types.id`. Los ID se mantienen numéricos y se resuelven con referencias en la API. No es posible borrar países ni tipos con puentes asociados.

## Campos

- **Puentes**: `id`, `name`, `city`, `country_id`, `bridge_type_id`, `completion_year`, `length_m`, `main_span_m`, `description`, `image_url`, `source_url`, `latitude`, `longitude`.
- **Países**: `id`, `name`, `continent`, `capital`, `iso_code`, `image_url`, `description`.
- **Tipos**: `id`, `name`, `description`, `structural_principle`, `typical_material`, `image_url`.
- **Usuarios**: `id`, `name`, `email`, `password_hash` (scrypt con salt), `role` (editor/viewer).

Los documentos son valores JSON almacenados como strings de Redis. Los conjuntos índices almacenan IDs para listar. Las claves de usuarios nunca se devuelven con su `password_hash` en los endpoints públicos.

**Datos iniciales**: 12 puentes, 8 países, 6 tipos provenientes de la migración SQL del Proyecto 1 (conservados en `data/seed.json`).
