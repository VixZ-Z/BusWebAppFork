# BusWebApp (Frontend + Supabase)

Proyecto de gestión de rutas de autobús, esto es un fork ya que la Aplicación real es para un solo usuario y actualmente se encuentra en uso.  
Permite registrar rutas/líneas de bus, temporizar trayectos y almacenar datos en una base de datos PostgreSQL usando Supabase.

Posteriormente se añadirá el seguimiento desde GoogleMaps.
---

## Tecnologías

- **Frontend:** HTML, CSS, JavaScript  
- **Base de datos:** PostgreSQL (Supabase)  
- **Autenticación y seguridad:** RLS (Row Level Security)  
- **Despliegue:** Vercel (Frontend)


## Características

- CRUD básico de rutas: insertar y consultar directamente desde el frontend.  
- Temporizador de rutas en tiempo real.  
- Persistencia local del estado usando IndexedDB.  
- UI sencilla para iniciar, pausar y finalizar rutas.

