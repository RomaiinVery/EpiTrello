# Cahier des Charges Technique — EpiTrello

Ce document détaille les spécifications fonctionnelles et techniques de la plateforme **EpiTrello**, un outil de gestion de projet collaboratif inspiré de Trello, enrichi de fonctionnalités pour développeurs.

---

## 1. Vue d'Ensemble du Projet

### 1.1 Objectifs
- Fournir une interface intuitive de gestion de tâches par colonnes (Kanban).
- Permettre une collaboration temps réel (Assignation, Commentaires).
- Intégrer des flux de travail "Developer-First" (Liaison GitHub, Markdown).

### 1.2 Stack Technique
- **Frontend :** Next.js 15 (App Router), React 19, TailwindCSS, Lucide Icons.
- **Backend :** Next.js API Routes, Prisma ORM.
- **Base de Données :** PostgreSQL.
- **Authentification :** NextAuth v5 (Auth.js).
- **Interactivité :** `@dnd-kit` pour le Drag & Drop.

### 1.3 Planning & Ressources
- **Durée :** 5 mois (1er Septembre — 31 Janvier).
- **Équipe :** 2 Développeurs (Rythme 3j/semaine).
- **Charge Estimée :** ~130 Jours-Hommes.

---

## 2. Spécifications Fonctionnelles & Techniques

### 2.1 Authentification & Comptes Utilisateurs
*État : Implémenté*

*   **Inscription (Register)**
    *   **Route API :** `POST /api/register`
    *   **Fichier Contrôleur :** `src/app/api/register/route.ts`
    *   **Validation Request Body :**
        *   `email` (Requis) : Doit être un email valide.
        *   `password` (Requis) : Présence obligatoire.
        *   `name` (Optionnel) : String.
        *   *Erreur 400* : "Request email and password" si champs manquants.
    *   **Validation Métier :**
        *   Vérification unicité email dans DB (`prisma.user.findUnique`).
        *   *Erreur 400* : "Email already taken" si existe déjà.
    *   **Traitement :**
        *   Hashage mot de passe via `bcrypt.hash(password, 12)`.
        *   Création User + Renvoi User sans mot de passe.
    *   **Modèle Prisma :**
        ```prisma
        model User {
          id           String   @id @default(uuid())
          email        String   @unique
          password     String
          name         String?
          // ...
        }
        ```
    *   **Stockage DB :** Table `User` (PostgreSQL).

*   **Connexion (Login)**
    *   **Route API :** `POST /api/auth/callback/credentials` (Géré par NextAuth)
    *   **Fichier Config :** `src/app/api/auth/[...nextauth]/route.ts`
    *   **Validation :**
        *   Vérification email/password via `authorize` callback.
        *   Comparaison hash `bcrypt.compare`.
        *   *Erreur* : "Invalid credentials" si échec.
    *   **Session :**
        *   Stratégie : JWT (`session: { strategy: "jwt" }`).
        *   Token stocké en cookie `HttpOnly`.
    *   **Modèle Utilisé :** `User` (Lecture uniquement).

*   **Gestion de Profil (Avatar)**
    *   **Fonctionnalité :** Upload et mise à jour de la photo de profil.
    *   **Stockage :** Local (`public/uploads/profiles`).
    *   **API Route :** `POST /api/user/profile-image`



### 2.2 Structure Organisationnelle (Workspaces / Tableaux)
*État : Implémenté*

*   **Lister les Tableaux**
    *   **Route API :** `GET /api/tableaux`
    *   **Contrôleur :** `src/app/api/tableaux/route.ts`
    *   **Logique Métier :**
        *   Récupère les tableaux où `userId` correspond à l'utilisateur connecté.
        *   Inclut les `boards` associés (id, title, description, createdAt).
    *   **Réponse :** Array de `Tableau`.

*   **Créer un Tableau**
    *   **Route API :** `POST /api/tableaux`
    *   **Validation Request Body :**
        *   `title` (Requis).
        *   `description` (Optionnel).
        *   *Erreur 400* : "Title is required" si manquant.
    *   **Modèle Prisma :**
        ```prisma
        model Tableau {
          id          String   @id @default(cuid())
          title       String
          description String?
          userId      String   // Owner
          boards      Board[]
          // ...
        }
        ```

*   **Détails / Modification / Suppression**
    *   **Routes API :**
        *   `GET /api/tableaux/[tableauId]`
        *   `PUT /api/tableaux/[tableauId]`
        *   `DELETE /api/tableaux/[tableauId]`
    *   **Validation Commune :**
        *   Vérifie que le tableau existe ET que `userId` = utilisateur connecté.
        *   *Erreur 404* : "Tableau not found" (si inexistant ou non autorisé).
    *   **Suppression :** Supprime le tableau (`prisma.tableau.delete`).


*   **Membres du Tableau**
    *   **Fonctionnalité :** Inviter (par email), lister et retirer des membres d'un espace de travail.
    *   **API Routes :**
        *   Lister : `GET /api/tableaux/[tableauId]/members`
        *   Inviter : `POST /api/tableaux/[tableauId]/members`
        *   Retirer : `DELETE /api/tableaux/[tableauId]/members`

*   **Gestion des Projets (Boards)**
    *   **Modèle Prisma :**
        ```prisma
        model Board {
          idString       String   @id @default(cuid())
          title          String,
          tableauId      String   // Lien parent
          userId         String   // Créateur
          lists          List[]   // Relation One-to-Many
          // ...
        }
        ```

*   **Création de Board**
    *   **Route API :** `POST /api/boards`
    *   **Validation Body :** `title` (Requis), `tableauId` (Requis).
    *   **Validation Métier :**
        *   Le `tableauId` doit appartenir à l'utilisateur (`prisma.tableau.findFirst`).
        *   *Erreur 404* : "Tableau introuvable ou non autorisé".
    *   **Side Effects (Effets de Bord) :**
        *   Création automatique de 3 listes par défaut : "To Do", "Doing", "Done".
    *   **Code :**
        ```typescript
        lists: {
          create: [
            { title: "To Do", position: 0 },
            { title: "Doing", position: 1 },
            { title: "Done", position: 2 },
          ],
        }
        ```

*   **Liste des Boards**
    *   **Route API :** `GET /api/boards`
    *   **Filtres (Query Params) :** `?tableauId=...`
    *   **Logique d'Accès :**
        *   Retourne les boards où l'utilisateur est PROPRIÉTAIRE (`userId`) OU MEMBRE (`members`).
        *   Clause Prisma : `OR: [{ userId: user.id }, { members: { some: { id: user.id } } }]`.

*   **Détails Board**
    *   **Route API :** `GET /api/boards/[boardId]`
    *   **Sécurité :**
        *   Vérifie si `isOwner` ou `isMember`.
        *   *Erreur 403* : "Forbidden" si aucun accès.

*   **Suppression Board**
    *   **Route API :** `DELETE /api/boards/[boardId]`
    *   **Sécurité :** SEUL le propriétaire (`userId`) peut supprimer (Pas les membres).


*   **Membres du Board**
    *   **Fonctionnalité :** Gestion des membres spécifiques à un board (hérités du tableau ou invités directs).
    *   **API Routes :**
        *   Lister : `GET /api/boards/[boardId]/members`
        *   Inviter : `POST /api/boards/[boardId]/members`

### 2.3 Gestion des Listes (Colonnes)
*État : Implémenté*

*   **Modèle Prisma `List` :**
    *   Fields: `id`, `title`, `position` (Int), `boardId`.
    *   Relation: `cards` (One-to-Many).

*   **CRUD Listes**
    *   **GET /api/boards/[boardId]/lists** : Retourne toutes les listes du board.
    *   **POST /api/boards/[boardId]/lists** : Création.
        *   Body: `{ title, position }`.
        *   *Erreur 400* : Si titre manquant/invalide.
    *   **PUT /api/boards/[boardId]/lists/[listId]** : Modification (Titre/Position).
    *   **PATCH /api/boards/[boardId]/lists/[listId]** : Réordonnancement spécifique.
        *   Body: `{ newPosition }`.
    *   **DELETE /api/boards/[boardId]/lists/[listId]** : Suppression en cascade des cartes.

### 2.4 Gestion des Cartes (Tâches)
*État : Implémenté*

*   **Modèle Prisma `Card` :**
    *   Fields: `id`, `title`, `content` (desc), `position`, `listId`, `coverImage`, `archived`.
    *   Relations: `labels`, `members`, `comments`, `activities`, `checklists`.

*   **Création de Carte**
    *   **Route API :** `POST /api/boards/.../lists/[listId]/cards`
    *   **Validation :** `title` (String, Requis).
    *   **Logique Position :** Calcul automatique (`lastCard.position + 1`).
    *   **Logging :** Crée une entrée `Activity` ("card_created").

*   **Détails et Modification**
    *   **GET /api/.../cards/[cardId]** : Retourne la carte avec `labels`, `members`, `list`.
    *   **PUT /api/.../cards/[cardId]** :
        *   Body: `{ title, content }`.
        *   *Restriction* : Impossible de modifier `coverImage` ici (utiliser route dédiée).
        *   **Logging :** Crée une entrée `Activity` ("card_updated") si titre/desc changent.
    *   **DELETE /api/.../cards/[cardId]** : Suppression + Log Activity "card_deleted".


### 2.5 Sous-Systèmes de la Carte
*État : Implémenté*

*   **Labels (Étiquettes)**
    *   **Route API :** `POST /api/boards/[boardId]/labels`
    *   **Body :** `{ name, color }` (Requis).
    *   **Constraintes :**
        *   Unicité du couple `[boardId, name]`. Refus si doublon.
    *   **Assignation :** `POST /api/boards/.../cards/.../labels` (Link via `CardLabel`).

*   **Checklists**
    *   **Route API :** `POST /api/boards/.../cards/.../checklists`
    *   **Body :** `{ title }` (Requis).
    *   **Items :**
        *   Modèle `ChecklistItem`: `text`, `checked` (Boolean), `position`.
        *   Tri : `orderBy: { position: 'asc' }`.

*   **Commentaires (Discussion)**
    *   **Route API :** `POST /api/boards/.../cards/.../comments`
    *   **Body :** `{ content }`.
    *   **Règle :** Contenu non vide requis.
    *   **Réponse :** Inclut l'objet `user` (id, name, email) pour affichage auteur.

*   **Pièces Jointes (Cover)**
    *   **Route API :** `POST /api/boards/.../cards/.../cover`
    *   **Tech :** `request.formData()`.
    *   **Validation Fichier :**
        *   Type : `image/jpeg`, `png`, `gif`, `webp`.
        *   Taille Max : 5MB.
    *   **Stockage :** Local dans `public/uploads/{filename}`.
    *   **Suppression :** `DELETE .../cover` => Supprime fichier du disque ET `coverImage: null` en DB.

*   **Historique (Activity)**
    *   **Logger Centralisé :** `logActivity()`
    *   **Types :** `card_created`, `card_updated`, `card_deleted`, `comment_added`, `cover_uploaded`, `cover_removed`.
    *   **Stockage :** Table `Activity`.


### 2.6 Routes Utilitaires
*   **Test API :** `GET /api/test-route`

### 2.7 Sécurité & Permissions (ACL)
*   **Hiérarchie des Rôles**
    *   **Propriétaire du Board (Admin)** : Créateur du board.
        *   *Droits :* Tout faire (Supprimer Board, Inviter/Bannir membres, Supprimer n'importe quel commentaire/carte/liste).
    *   **Membre du Board** : Invité ayant accepté l'accès.
        *   *Droits :* Créer/Modifier/Déplacer Cartes, Listes, Labels. Commenter.
        *   *Restrictions :* Ne peut PAS supprimer le board ni bannir le Propriétaire.
    *   **Visiteur (Non-membre)** : Accès refusé (403 Forbidden).

*   **Règles de Gestion Spécifiques**
    *   **Suppression de Commentaire :**
        *   L'auteur PEUT supprimer son propre commentaire.
        *   Le Propriétaire du Board PEUT supprimer TOUS les commentaires (Modération).
        *   Un membre lambda NE PEUT PAS supprimer le commentaire d'un autre membre.
    *   **Modification de Carte :**
        *   Tout membre du board peut modifier titre/desc/labels (Esprit Wiki/Collaboratif).
    *   **Suppression de Carte/Liste :**
        *   Tout membre du board peut supprimer (Attention : Action destructive partagée).

---

## 3. Expérience Utilisateur & Flux (UX Flows)

Cette section décrit le comportement attendu de l'interface pour chaque facette de l'application, en mettant l'accent sur la fluidité et le retour visuel.

### 3.1 Authentification & Onboarding
*   **Flux d'Inscription**
    *   **Action :** Utilisateur remplit le formulaire `/register`.
    *   **Succès :** Redirection immédiate vers `/login` avec un Toast vert "Compte créé".
    *   **Erreur :** Message d'erreur inline sous le champ concerné (ex: "Email déjà utilisé").
*   **Flux de Connexion**
    *   **Action :** Utilisateur remplit `/login`.
    *   **Succès :** Redirection vers `/tableaux` (Dashboard).
    *   **Session Expirée :** Si le token JWT expire, redirection automatique vers `/login` avec paramètre `callbackUrl` pour revenir à la page précédente après reconnexion.

### 3.2 Navigation & Structure (Workspaces)
*   **Création de Tableau (Workspace)**
    *   **Action :** Bouton "+" dans la Sidebar ou Dashboard.
    *   **Modale :** S'ouvre avec focus automatique sur l'input "Titre".
    *   **Validation :** Touche `Entrée` soumet le formulaire.
    *   **Feedback :**
        *   Le tableau apparaît **instantanément** dans la liste latérale (Optimistic UI).
        *   L'application navigue automatiquement vers ce nouveau tableau.
*   **Création de Board (Projet)**
    *   **Action :** Dans un Tableau, bouton "Créer un board".
    *   **UX :** Sélection rapide (Titre + Couleur de fond optionnelle).
    *   **Transition :** Redirection immédiate vers la vue du Board (`/boards/[id]`).

### 3.3 Gestion Quotidienne (Listes & Cartes)
*   **Drag & Drop (DnD - Core Feature)**
    *   **Cartes :** Déplacement fluide.
        *   *Feedback* : La carte suit le curseur, une ombre indique la future position.
        *   *Drop* : Placement instantané. Appel API asynchrone (`PUT`).
        *   *Erreur API* : Toast "Échec du déplacement" + Rollback (Carte revient à sa place).
    *   **Listes :** Réorganisation horizontale via la poignée (Handle).
*   **Création Rapide**
    *   **Action :** "Ajouter une carte" (Bas de liste).
    *   **Comportement :**
        *   L'input remplace le bouton.
        *   `Entrée` valide => Crée la carte + Vide l'input (reste focus).
        *   Permet de créer 10 cartes à la suite sans toucher la souris ("Batch Mode").

### 3.4 Modale Carte Détail (Le Cœur du Produit)
*   **Navigation & URL**
    *   **Ouverture :** Click sur une carte => Ouvre une Modale par-dessus le board.
    *   **URL :** L'URL change (`/cards/123`) pour permettre le partage direct (Deep Linking).
    *   **Fermeture :** `Esc`, Click extérieur, ou Bouton X. L'URL revient au board parent.
*   **Édition de Description (Rich Text)**
    *   **Action :** Click dans la zone de texte passe en mode "Édition".
    *   **Sauvegarde :** Automatique au `Blur` (perte de focus) ou `Cmd+Enter`.
    *   **Feedback :** Texte "Enregistré..." discret à côté du titre.
*   **Labels & Membres**
    *   **Interaction :** Popovers (petites fenêtres flottantes).
    *   **Sélection :** Click sur un label/membre = Toggle instantané. Pas de bouton "Sauvegarder", l'action est directe.
*   **Checklists**
    *   **Progression :** La barre de progression (ex: 3/10) s'anime en temps réel à chaque case cochée.
*   **Commentaires**
    *   **Envoi :** `Cmd+Enter` pour envoyer rapidement.
    *   **Affichage :** Apparition immédiate en bas de liste.

### 3.5 Gestion des Erreurs et Cas Limites
*   **Actions Destructives**
    *   **Suppression (Board/Carte) :**
        *   Toujours demander confirmation via une Modale/Alert native.
        *   Message clair : "Cette action est irréversible".
*   **Perte de Réseau**
    *   **Indicateur :** Toast jaune/orange "Connexion perdue".
    *   **Sécurité :** Désactiver les boutons critiques (Création/Suppression) pour éviter les incohérences de données.
    *   **Reconnexion :** Toast vert "Connexion rétablie" + Rechargement silencieux des données (`swr/mutate` ou `react-query`).
*   **États Vides**
    *   **Board Vide :** Afficher une illustration sympa + Flèche vers "Ajouter une liste".
    *   **Recherche vide :** "Aucun résultat pour 'xyz'".

---

## 4. Spécifications Détaillées des Fonctionnalités Futures (Hyper-Dev)

L'objectif est de transformer EpiTrello en une "Power App" dépassant les standards du marché.

### 4.1 Moteur d'Automatisation (Code-First "RobzBot")
*Concept : Permettre des actions en chaîne sans code pour l'utilisateur.*

*   **Modèle de Donnée : `AutomationRule`**
    ```prisma
    model AutomationRule {
      id          String   @id @default(cuid())
      boardId     String
      triggerType String   // ex: "CARD_MOVED_TO_LIST"
      triggerVal  String   // ex: "Done List ID"
      actionType  String   // ex: "ARCHIVE_CARD"
      isActive    Boolean  @default(true)
    }
    ```
*   **Logique Backend :**
    *   Middleware/Hook global sur les routes API (`POST/PUT/DELETE`).
    *   Exemple : Après `PUT .../cards/{id}` (déplacement), vérifier si une règle matche la `destinationListId`.
    *   Exécution asynchrone de l'action.
*   **Routes API :**
    *   `POST /api/boards/[boardId]/automations` : Créer une règle.
    *   `GET /api/boards/[boardId]/automations/logs` : Historique des automations exécutées.

### 4.2 Vue Chronologique (Gantt Interactif)
*Concept : Visualiser la durée des tâches sur une timeline.*

*   **Pré-requis DB :**
    *   Ajout de champs `startDate` (DateTime) et `dueDate` (DateTime) au modèle `Card`.
*   **Composant Frontend :**
    *   Utilisation de `gantt-task-react` ou implémentation custom SVG.
    *   Drag to Resize : Modifier la durée met à jour `dueDate`.
    *   Drag to Move : Modifier le début met à jour `startDate` et `dueDate` (décalage).
*   **Route API Spécifique :**
    *   `GET /api/boards/[boardId]/timeline` : Retourne cartes formatées pour Gantt (start, end, dependencies).

### 4.3 Assistant IA Intégré (EpiAI)
*Concept : Un co-pilote pour la gestion de projet.*

*   **Fonctionnalités :**
    1.  **"Smart Tagging"** : Analyse le `content` de la carte et suggère des labels existants.
    2.  **"Summarize"** : Résume un long fil de discussion (commentaires) en une note épinglée.
    3.  **"Breakdown"** : Transforme une description vague en une Checklist d'actions concrètes.
*   **Architecture :**
    *   Route : `POST /api/ai/suggest`
    *   Provider : OpenAI API (GPT-4o-mini pour la vitesse).
    *   Prompt System : "Tu es un Project Manager expert..."

### 4.4 Notifications Temps Réel (Server-Sent Events)
*Concept : Plus de rafraîchissement manuel.*

*   **Architecture SSE (Server-Sent Events) :**
    *   Plus léger que WebSockets pour ce use-case (Unidirectionnel Server -> Client).
    *   Endpoint : `GET /api/events?boardId=...` (Connection Keep-Alive).
*   **Flux :**
    1.  Client s'abonne à `boardId`.
    2.  User A déplace une carte.
    3.  Backend sauve en DB ET pousse l'événement dans un `EventEmitter` global (Redis Pub/Sub si scaling requis).
    4.  Endpoint SSE reçoit l'event et l'envoie à User B.
    5.  Client React (User B) met à jour le state local (Optimistic UI déjà là, confirmation server ensuite).

### 4.5 Mode "Focus" (Pomodoro Intégré)
*Concept : Lier gestion de tâche et productivité personnelle.*

*   **Fonctionnalité :**
    *   Bouton "Start Focus" sur une carte.
    *   Timer 25min flottant sur l'UI.
    *   Si fini => Propose de marquer la tâche "Done".
    *   Si interrompu => Log le temps passé.
*   **Stockage :**
    *   Modèle `TimeLog` : `{ cardId, userId, durationSeconds, startedAt }`.
    *   Dashboard statistique personnel ("Temps de focus cette semaine").
