# 🏗️ Dossier d'Architecture & Choix Techniques — EpiTrello

## 1. Vue d'ensemble de la Stack

L'architecture choisie est un **Monolithe Modulaire** basé sur l'écosystème Next.js. Ce choix privilégie la vitesse de développement (*Time-to-Market*) et la cohérence des types (*Type Safety*) sur une complexité prématurée de microservices.

| Couche | Technologie | Alternative écartée | Pourquoi ce choix ? |
| :--- | :--- | :--- | :--- |
| **Framework** | **Next.js 14+ (App Router)** | React Vite (SPA) | SSR pour la performance, API Routes intégrées (pas de backend séparé à gérer). |
| **Langage** | **TypeScript** | JavaScript | Fiabilité du code, autocomplétion, maintenance facilitée à 2 développeurs. |
| **UI / Style** | **Tailwind CSS + shadcn/ui** | Styled Components, MUI | **Rapidité :** Pas de fichier CSS séparé. **Poids :** Bundle CSS minime. |
| **Base de Données** | **PostgreSQL** | MongoDB | **Fiabilité :** Relations complexes (Workspace -> Board -> List -> Card) nécessitent une intégrité référentielle stricte (SQL). |
| **ORM** | **Prisma** | TypeORM, Drizzle | **DX (Dev Experience) :** Typage bout-en-bout automatique avec TypeScript. |
| **Auth** | **NextAuth.js (v5)** | Clerk, Auth0 | **Coût :** Gratuit & Open Source. **Contrôle :** Données propriétaires. |
| **Drag & Drop** | **@dnd-kit** | react-beautiful-dnd | **Modernité :** Supporte React 18+, accessible, plus léger et modulaire. |

---

## 2. Analyse Détaillée & Justifications

### A. Le Cœur : Next.js & Server Actions
* **Pourquoi ?** Unifie le Frontend et le Backend. Permet d'appeler la base de données directement depuis les composants serveur ou via des "Server Actions" sans créer manuellement une API REST JSON classique.
* **Gain de Rapidité :** On estime un gain de **30%** sur le temps de développement en évitant la duplication des types (DTOs) entre le front et le back.
* **Fiabilité :** Moins de risque de désynchronisation entre l'API et le client.

### B. Base de Données : PostgreSQL & Prisma
* **Le Besoin :** Trello est intrinsèquement relationnel. Un utilisateur a des tableaux, qui ont des listes, qui ont des cartes.
* **Pourquoi SQL vs NoSQL ?**
    * *Mongo (NoSQL)* aurait facilité le stockage du JSON, mais aurait complexifié les requêtes de jointure (ex: "Trouver toutes les cartes assignées à User X dans les Boards où il est membre").
    * *Postgres* garantit l'intégrité (ACID). Si on supprime une liste, la cascade delete de SQL supprime proprement les cartes associées.
* **Performance :** Prisma gère le *connection pooling* (optimisation des connexions BDD), crucial en environnement Serverless (Vercel).

### C. Drag & Drop : @dnd-kit
* **Problématique :** Le DnD est la fonctionnalité critique. Elle doit être fluide (60fps).
* **Pourquoi @dnd-kit ?**
    * Contrairement à `react-beautiful-dnd` (qui n'est plus activement maintenu), `@dnd-kit` est *headless* (sans style imposé) et construit pour React moderne (Hooks).
    * **Poids :** ~10kb (minified) contre ~30kb pour les alternatives.
    * **Fiabilité :** Gère mieux les cas limites (mobile, clavier, lecteurs d'écran).

---

## 3. Chiffrage & Coûts (Estimation)

### 💰 Coûts Financiers (Infrastructure)

Pour un projet étudiant ou une startup en phase de lancement (MVP), l'objectif est le **Zéro Dépense**.

| Poste de Dépense | Solution Retenue | Coût Mensuel | Scalabilité |
| :--- | :--- | :--- | :--- |
| **Hébergement App** | **Vercel Hobby Tier** | **0 €** | Jusqu'à 1M requêtes/mois. Passage Pro à 20$/mois ensuite. |
| **Base de Données** | **Neon / Supabase (Postgres)** | **0 €** | 500MB de stockage gratuit (suffisant pour ~100k cartes). |
| **Stockage Fichiers** | **Local (MVP) / Cloudinary** | **0 €** | Stockage local gratuit. Cloudinary offre 25GB gratuits. |
| **Domaine** | `*.vercel.app` | **0 €** | 10-15€/an si achat d'un .com |
| **TOTAL** | | **0 € / mois** | **Architecture viable jusqu'à ~1000 utilisateurs actifs.** |

### ⏱️ Coûts Temporels (Développement à 2 personnes)

Estimation de la "dette technique" évitée grâce aux choix technologiques :

* **Utilisation de shadcn/ui :** Gain estimé de **40h** sur le design system (boutons, modales, inputs sont pré-codés et accessibles).
* **Utilisation de Prisma :** Gain estimé de **20h** sur l'écriture des requêtes SQL et des migrations manuelles.
* **Utilisation de NextAuth :** Gain estimé de **30h** par rapport à une authentification maison sécurisée (JWT, Session, CSRF protection).

**Total temps "gagné" : ~90 heures (~11 jours-hommes).**
Cela permet de tenir le délai de 5 mois en travaillant à mi-temps.

---

## 4. Fiabilité & Sécurité

### Sécurité (OWASP)
1.  **Injections SQL :** **Prisma** protège nativement contre les injections SQL grâce aux requêtes paramétrées.
2.  **XSS (Cross-Site Scripting) :** **React** échappe automatiquement les contenus affichés pour prévenir l'exécution de scripts malveillants.
3.  **CSRF :** **NextAuth** gère automatiquement les tokens CSRF pour sécuriser les mutations (POST/PUT/DELETE).
4.  **Protection des Routes :** Le fichier `middleware.ts` assure qu'aucune page `/board/*` n'est accessible sans une session valide.

### Fiabilité des Données
* **Transactions :** Pour le réordonnancement (DnD), nous utilisons des transactions Prisma (`prisma.$transaction`).
    * *Scénario :* Si on déplace une carte et que la mise à jour de sa position échoue, la carte "revient" à sa place initiale. Pas d'état corrompu en base de données.

---

## 5. Performance & Rapidité (Métriques)

L'architecture Next.js App Router permet des optimisations automatiques :

1.  **Code Splitting :** Chaque page (ex: `/settings`) ne charge que le JavaScript nécessaire. Le poids initial est réduit.
2.  **Server Components (RSC) :** Les composants lourds (ex: la Navbar, la Sidebar) sont rendus sur le serveur et envoyés en HTML pur. Moins de JS à exécuter sur le navigateur du client = affichage plus rapide (First Contentful Paint).
3.  **Optimistic UI :**
    * Lors d'un Drag & Drop, l'interface se met à jour **immédiatement** (0ms de latence perçue).
    * La requête API part en arrière-plan.
    * Si l'API échoue, l'interface effectue un "rollback" (retour en arrière).
    * *Impact :* Sensation de fluidité native, même avec une connexion lente.

---

## 6. Limites & Risques Identifiés

* **Cold Starts (Vercel) :** En version gratuite (Serverless), l'API peut prendre 1 à 2 secondes à répondre si elle n'a pas été utilisée depuis un moment.
    * *Solution :* Passer sur un VPS (Docker) ou payer le plan Pro pour garder les fonctions "chaudes".
* **Webhooks GitHub (Local) :** Tester les webhooks en local (localhost) est complexe car GitHub ne peut pas appeler votre machine.
    * *Solution :* Utilisation d'outils de tunneling comme `ngrok` ou `smee.io` pour le développement.
* **Vendor Lock-in (Vercel) :** Next.js est très optimisé pour Vercel.
    * *Mitigation :* Nous utilisons Docker (`Dockerfile` présent) pour garantir que l'application peut être hébergée n'importe où (AWS, OVH, VPS) sans dépendance forte à Vercel.