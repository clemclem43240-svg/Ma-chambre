# Ma chambre

Appli téléphone pour piloter ma chambre : Xbox et télé, météo réelle, présence de l'iPhone, agenda, rappels, notifications, lumières Hue (chevet, plafonnier/bureau, ruban sous le canapé), volets et porte de garage Somfy. Mode démo tant que Home Assistant n'est pas branché.

Adresse : https://clemclem43240-svg.github.io/Ma-chambre/

Installer sur iPhone : ouvrir le lien dans Safari → Partager → « Sur l'écran d'accueil ».

## Tableau de bord tablette

Adresse : https://clemclem43240-svg.github.io/Ma-chambre/tablette/

Météo réelle (Open-Meteo), heure, Xbox et télé, présence de l'iPhone, agenda, rappels et notifications. Mode démo tant que Home Assistant n'est pas branché. L'adresse et la clé de Home Assistant se saisissent dans Réglages et restent uniquement sur la tablette, jamais dans ce dépôt.

## Brancher sur Home Assistant

Safari refuse qu'une page en https (GitHub Pages) parle à Home Assistant en http sur le réseau local. On installe donc une copie de l'appli **dans** Home Assistant (dossier `www` de la configuration) et on l'ouvre depuis le wifi de la maison :

- Téléphone : `http://<adresse-de-home-assistant>:8123/local/ma-chambre/index.html`
- Tablette : `http://<adresse-de-home-assistant>:8123/local/ma-chambre/tablette/index.html`

Installation (une fois) : `git clone --depth 1 https://github.com/clemclem43240-svg/Ma-chambre.git <config>/www/ma-chambre` puis redémarrer Home Assistant. Mise à jour : `git -C <config>/www/ma-chambre pull`.

L'adresse se remplit toute seule ; il reste à coller un jeton longue durée dans Réglages puis « Tester », qui trouve les appareils. Le jeton reste sur l'appareil, jamais dans ce dépôt.

## Version légère pour vieille tablette (Android 4.4)

`tablette/lite.html` : même tableau de bord en plus simple (JavaScript ES5, sans flou ni police externe) pour les vieux navigateurs. Météo lue dans Home Assistant (entité `weather`). Connexion possible avec l'identifiant et le mot de passe Home Assistant (jeton renouvelé tout seul, gardé uniquement sur la tablette) ou avec un jeton longue durée.

Adresse : `http://<adresse-de-home-assistant>:8123/local/ma-chambre/tablette/lite.html`

## Thèmes selon la Xbox

Quand la Xbox lance Netflix, YouTube, Forza ou GTA 6, l'appli et la version légère de la tablette changent de décor toutes seules : rideau, ticket et fauteuils de cinéma pour Netflix ; jungle (liane, feuilles, lucioles) pour YouTube ; vrai combiné de voiture avec animation de démarrage pour Forza (tablette) ; coucher de soleil, ville et palmier pour GTA 6. Réglages › Thème permet de forcer un thème pour l'essayer, et sur la tablette « Animations des thèmes » coupe les mouvements si elle rame. Le téléphone n'a pas d'animation. Images : voir `themes/CREDITS.md`.
