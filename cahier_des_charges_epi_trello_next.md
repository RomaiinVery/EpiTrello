# Cahier des charges — EpiTrello

## 1. Présentation générale
**Nom du projet :** EpiTrello  
**Type de projet :** Application web de gestion de projet collaborative  
**Objectif :** Reproduire et adapter les principales fonctionnalités de Trello afin de permettre la gestion visuelle des tâches à l’aide d’un système de tableaux, listes et cartes.

---

## 2. Contexte et but du projet
Trello est un outil de gestion de projet inspiré de la méthode Kanban de Toyota. Il permet de visualiser l’avancement des tâches à travers des cartes que l’on déplace entre plusieurs listes représentant les étapes d’un projet.

**EpiTrello** vise à recréer une version simplifiée mais complète de cet outil, permettant aux utilisateurs de :
- Organiser leurs projets sous forme de tableaux.
- Créer, modifier et déplacer des cartes représentant les tâches.
- Collaborer à plusieurs en assignant des cartes à différents utilisateurs.
- Suivre la progression du travail grâce à une interface claire et intuitive.

---

## 3. Objectifs fonctionnels
### Fonctionnalités principales :
1. **Gestion des espaces de travail (Workspaces)**  
   - Création, modification et suppression d’espaces de travail. (fait)
   - Gestion des membres et des rôles (propriétaire, administrateur, membre, invité). (pas fait)

2. **Tableaux (Boards)**  
   - Création et personnalisation de tableaux par workspace. (fait)
   - Attribution de la visibilité (privé, workspace, public). (fait)

3. **Listes (Lists)**  
   - Création et modification des listes dans un tableau. (fait)
   - Réorganisation des listes par glisser-déposer. (fait)

4. **Cartes (Cards)**  
   - Création, édition et suppression de cartes. (fait)
   - Déplacement entre listes par drag and drop. (fait)
   - Ajout d’étiquettes, de membres assignés et de dates d’échéance. (fait)
   - Commentaires, pièces jointes et checklists. (fait)

5. **Collaboration**  
   - Attribution des cartes aux utilisateurs. (fait)
   - Historique d’activité sur chaque carte et tableau. (fait pour les cartes)
   - Invitations par e‑mail pour rejoindre un workspace. ( pas fait)

6. **Recherche et filtrage**  
   - Recherche par texte, étiquette, membre ou date limite. (pas fait)

---

## 4. Objectifs non fonctionnels
- **Performance :** Temps de chargement rapide et interface fluide.
- **Sécurité :** Authentification sécurisée (e‑mail ou OAuth), gestion des rôles et permissions.
- **Accessibilité :** Conformité aux normes WCAG 2.1 niveau AA.
- **Ergonomie :** Interface claire, intuitive et responsive.
- **Confidentialité :** Conformité au RGPD.

---

## 5. Utilisateurs et rôles
- **Owner (Propriétaire) :** Gère l’ensemble du workspace, des membres et des permissions.
- **Admin :** Gère les tableaux et les membres sans pouvoir transférer la propriété.
- **Member :** Peut créer et modifier des listes et cartes.
- **Guest :** Accès limité à la lecture (et éventuellement commentaires).

---

## 6. Parcours utilisateur (exemples)
- Créer un nouveau tableau dans son workspace.
- Ajouter des listes représentant les étapes d’un projet.
- Ajouter des cartes avec des descriptions, dates et assignations.
- Déplacer les cartes selon leur avancement.
- Inviter d’autres utilisateurs à collaborer.
- Ajouter des commentaires et fichiers sur les cartes.

---

## 7. Contraintes techniques
- **Frontend et Backend :** Framework Next.js.
- **Langage :** TypeScript.
- **Base de données :** PostgreSQL (hébergée sur Supabase ou Neon).
- **ORM :** Prisma.
- **Authentification :** NextAuth.js.
- **Interface :** Tailwind CSS et composants UI accessibles.
- **Déploiement :** Vercel (ou équivalent cloud), base de données managée.

---

## 8. Sécurité et conformité
- Utilisation de connexions sécurisées (HTTPS).
- Gestion des sessions via cookies sécurisés.
- Protection CSRF et validation stricte des entrées.
- Exportation et suppression des données utilisateur (RGPD).

---

## 9. Interface et expérience utilisateur
- Design sobre et épuré.
- Mode clair/sombre automatique selon les préférences du système.
- Disposition en colonnes représentant les listes de tâches.
- Glisser-déposer fluide et responsive.
- Moteur de recherche intégré.
- Navigation latérale pour accéder aux différents workspaces et tableaux.

---

## 10. Planification du projet (exemple)
| Semaine | Tâches principales |
|----------|--------------------|
| Semaine 1 | Création du dépôt, configuration du projet et de la base de données |
| Semaine 2 | Développement des fonctionnalités de base (Workspaces, Boards, Lists) |
| Semaine 3 | Implémentation des cartes et du drag & drop |
| Semaine 4 | Collaboration (assignation, commentaires, fichiers) |
| Semaine 5 | Recherche, filtres, tests et corrections |
| Semaine 6 | Finalisation, optimisation et déploiement |

---

## 11. Critères de réussite
- L’utilisateur peut gérer un projet complet à travers un workspace, un tableau, des listes et des cartes.
- Le déplacement d’une carte met instantanément à jour sa position et sa liste.
- L’authentification et les rôles fonctionnent correctement.
- L’interface est claire, fluide et responsive.
- Le projet est conforme aux exigences de sécurité et de performance.

---

## 12. Évolutions possibles
- Ajout de notifications en temps réel.
- Intégration d’un calendrier et de statistiques d’avancement.
- Automatisations (rappels, règles personnalisées).
- Application mobile ou PWA.

---

**Livrable attendu :** une application web fonctionnelle, déployée, documentée et testée, répondant aux exigences ci‑dessus.

