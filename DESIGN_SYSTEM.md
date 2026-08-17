# 🎨 CHARTE GRAPHIQUE QNOOK

## 1. PALETTE DE COULEURS

### Couleurs Principales
```
Bleu Premium (Confiance, Calme)
  HEX: #0066FF
  RGB: 0, 102, 255
  Usage: Boutons principaux, accents, appels à l'action

Noir Professionnel (Autorité, Sécurité)
  HEX: #1A1A2E
  RGB: 26, 26, 46
  Usage: Texte principal, fond sombre, header/footer

Blanc Pur (Clarté, Propreté)
  HEX: #FFFFFF
  RGB: 255, 255, 255
  Usage: Fonds, texte sur fond sombre

Gris Moderne (Subtilité, Hiérarchie)
  HEX: #F5F5F7
  RGB: 245, 245, 247
  Usage: Fonds secondaires, cartes, séparations
```

### Couleurs Secondaires
```
Vert Succès (Validation, Positif)
  HEX: #10B981
  RGB: 16, 185, 129
  Usage: Confirmations, indicateurs positifs, "OK"

Orange Énergie (Dynamisme, Attention)
  HEX: #FF8C42
  RGB: 255, 140, 66
  Usage: Appels à l'action secondaires, notifications urgentes

Rouge Alerte (Danger, Refus)
  HEX: #EF4444
  RGB: 239, 68, 68
  Usage: Erreurs, refus, avertissements

Violet Créatif (Innovation, Premium)
  HEX: #A855F7
  RGB: 168, 85, 247
  Usage: Accents premium, fidélité
```

---

## 2. TYPOGRAPHIE

### Polices Recommandées
```
Font Primaire: Inter (Google Fonts - gratuit)
  - Modern, clean, lisible
  - Poids: Light (300), Regular (400), SemiBold (600), Bold (700)
  - Usage: Tous les textes

Font Secondaire: Poppins (Google Fonts - gratuit)
  - Friendly, approachable
  - Poids: Regular (400), SemiBold (600)
  - Usage: Titres, accents
```

### Tailles de Texte
```
H1 (Titre Principal): 4rem (64px) - Bold
  "🛋️ Qnook" sur écran d'accueil

H2 (Titre Section): 2rem (32px) - SemiBold
  "Choisissez votre durée"

H3 (Sous-titre): 1.5rem (24px) - SemiBold
  "Session en cours"

Body (Texte Normal): 1rem (16px) - Regular
  Description, instructions

Small (Texte Petit): 0.875rem (14px) - Regular
  Labels, informations secondaires

Caption (Texte Très Petit): 0.75rem (12px) - Regular
  Timestamps, métadonnées
```

### Hiérarchie Typographique
```
1. Titre principal (H1): 64px, Bold, Noir
2. Titre section (H2): 32px, SemiBold, Noir
3. Sous-titre (H3): 24px, SemiBold, Bleu
4. Texte principal: 16px, Regular, Noir
5. Texte secondaire: 14px, Regular, Gris
6. Légende: 12px, Regular, Gris clair
```

---

## 3. COMPOSANTS & STYLES

### Boutons

#### Bouton Principal (Primaire)
```
Fond: Bleu Premium (#0066FF)
Texte: Blanc, Bold
Padding: 12px 32px
Border Radius: 8px
Font Size: 1rem
Transition: 0.3s ease
Hover: Fond Bleu Foncé (#0052CC), ombre légère
Active: Fond Bleu Très Foncé (#0040CC), enfoncement
Shadow: 0 4px 12px rgba(0, 102, 255, 0.3)
```

#### Bouton Secondaire
```
Fond: Gris (#F5F5F7)
Texte: Noir, SemiBold
Padding: 12px 32px
Border: 1px solid #E0E0E0
Border Radius: 8px
Hover: Fond Gris plus foncé (#EFEFEF)
```

#### Bouton Succès
```
Fond: Vert (#10B981)
Texte: Blanc, Bold
Padding: 12px 32px
Border Radius: 8px
Icon: ✅
```

#### Bouton Danger
```
Fond: Rouge (#EF4444)
Texte: Blanc, Bold
Padding: 12px 32px
Border Radius: 8px
Icon: ❌
```

### Cartes & Conteneurs

#### Carte Produit
```
Fond: Blanc (#FFFFFF)
Border: 1px solid #E5E7EB
Border Radius: 12px
Padding: 20px
Shadow: 0 2px 8px rgba(0, 0, 0, 0.08)
Hover: 
  - Shadow: 0 8px 24px rgba(0, 102, 255, 0.15)
  - Transform: translateY(-4px)
  - Transition: 0.3s ease
```

#### Conteneur Info
```
Fond: Bleu Très Clair (#F0F4FF)
Border Left: 4px solid #0066FF
Padding: 16px
Border Radius: 8px
Icon: ℹ️
Texte: Gris Sombre
```

#### Conteneur Alerte
```
Fond: Orange Très Clair (#FFF5EB)
Border Left: 4px solid #FF8C42
Padding: 16px
Border Radius: 8px
Icon: ⚠️
Texte: Orange Foncé
```

### Champs de Saisie

```
Fond: Blanc (#FFFFFF)
Border: 1px solid #D1D5DB
Border Radius: 8px
Padding: 12px 16px
Font Size: 1rem
Focus:
  - Border Color: #0066FF
  - Box Shadow: 0 0 0 3px rgba(0, 102, 255, 0.1)
  - Transition: 0.2s ease
Error:
  - Border Color: #EF4444
  - Background: #FEF2F2
```

### États & Indicateurs

#### Spinner de Chargement
```
Animation: Rotation 1.5s infini
Couleur: Bleu Premium (#0066FF)
Taille: 40px
Style: Cercle avec pointillé
```

#### Badge Statut
```
Connecté: 🟢 Vert (#10B981) - "Prêt"
Chargement: 🟡 Orange (#FF8C42) - "Connexion..."
Erreur: 🔴 Rouge (#EF4444) - "Erreur"
Inactif: ⚪ Gris (#9CA3AF) - "Inactif"
```

---

## 4. LAYOUTS & ESPACES

### Espacement (système 8px)
```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
3xl: 64px
```

### Largeurs Conteneurs
```
Mobile (< 640px): 100% - 16px padding
Tablet (640px - 1024px): 600px
Desktop (> 1024px): 900px
```

### Z-Index Hiérarchie
```
Base: 0
Conteneur: 10
Modal: 100
Tooltip: 110
Dropdown: 120
Toast/Notification: 130
Clavier Virtuel: 1000
Modal Inactivité: 2000
```

---

## 5. ÉCRANS PRINCIPAUX

### Écran 1: Accueil (Welcome)
```
Background: Gradient Bleu (haut) → Noir (bas)
  linear-gradient(135deg, #0066FF 0%, #1A1A2E 100%)

Layout:
  - Centered, Full Height
  - Titre: "🛋️ Qnook" (64px, Blanc)
  - Sous-titre: "Bienvenue chez Qnook" (24px, Blanc)
  - Call-to-Action: "Touchez l'écran pour commencer" (16px, Gris clair)
  - Badge Statut: "✅ Lecteur connecté" (12px, Vert, en bas)

Animation:
  - Fade-in au chargement
  - Pulse subtle sur le titre
```

### Écran 2: Chargement Lecteur
```
Background: Dégradé Noir (#1A1A2E)

Layout:
  - Centered
  - Spinner: 60px, Bleu
  - Texte: "🔄 Connexion au lecteur..." (24px, Blanc)
  - Sous-texte: "Veuillez patienter..." (16px, Gris)

Animation:
  - Spinner 1.5s rotation
  - Pulse text
```

### Écran 3: Sélection Produits
```
Background: Blanc/Gris (#F5F5F7)

Layout:
  - Header: "Choisissez votre durée" (32px, Noir)
  - Sous-header: "Touchez la durée qui vous convient" (16px, Gris)
  - Grille: 2-4 colonnes (responsive)
  - Espacement: 20px entre cartes

Carte Produit:
  - Emoji: 48px (🕐, 📌, etc.)
  - Titre: "30 min" (20px, Bold)
  - Prix: "15,00 €" (18px, Bleu, Bold)
  - Promo (si applicable): "Strikethrough + Rouge"
  - Hover: Ombre, léger lift

Button: "Choisir" n'est PAS visible, card entière est cliquable
```

### Écran 4: Formulaire Email
```
Background: Blanc avec ombre douce

Layout:
  - Titre: "Options de la session" (24px, Noir)
  - Info Box: "ℹ️ Comment ça fonctionne" (Bleu clair, Border-left Bleu)
  - Checkboxes: "Recevoir reçu", "Recevoir rappel"
  - Champ Email: Complet si checkbox coché
  - Buttons: "Démarrer" (Bleu) | "Annuler" (Gris)

Validations:
  - Email invalide: Border rouge, message d'erreur
  - Clavier virtuel: Apparaît au-dessus du formulaire
```

### Écran 5: Session Active
```
Background: Gradient (Bleu → Noir)

Layout:
  - Titre: "Session en cours" (28px, Blanc)
  - Produit: "30 min (15,00 €)" (18px, Gris clair)
  - Timer: "23:45" (72px, Monospace, Blanc, Glow)
  - Buttons: "Terminer et payer" (Vert, gros) | "Annuler" (Gris)

Animation:
  - Timer tick chaque seconde
  - Glow effect sur le timer
  - Pulse si dépassement temps
```

### Écran 6: Erreur Lecteur
```
Background: Gradient Noir → Noir Profond

Layout:
  - Icône: ❌ (48px, Rouge)
  - Titre: "Erreur de connexion" (24px, Blanc)
  - Message: Message d'erreur détaillé (16px, Gris clair)
  - Button: "🔄 Réessayer" (Bleu, centré)

Animation:
  - Shake animation au premier affichage
  - Pulse on button hover
```

---

## 6. ANIMATIONS & TRANSITIONS

### Transitions Globales
```
Default: 0.3s ease
Fast: 0.15s ease-in-out
Slow: 0.5s ease-in-out
```

### Animations Spécifiques

#### Fade-in
```
opacity: 0 → 1
duration: 0.4s
easing: ease-in-out
```

#### Slide-up
```
transform: translateY(20px) → translateY(0)
opacity: 0 → 1
duration: 0.5s
```

#### Pulse
```
opacity: 1 → 0.7 → 1
duration: 2s
infinite
```

#### Shake
```
transform: translateX(-5px) → 5px → -5px → 0
duration: 0.4s
easing: ease-in-out
```

#### Glow
```
filter: brightness(1) → brightness(1.2) → brightness(1)
duration: 2s
infinite
```

---

## 7. RESPONSIVE DESIGN

### Mobile (< 640px)
```
- Font H1: 2.5rem (au lieu de 4rem)
- Font H2: 1.5rem (au lieu de 2rem)
- Padding global: 16px
- Grille produits: 1 colonne
- Boutons: 100% width
```

### Tablet (640px - 1024px)
```
- Font sizes: 90% des valeurs desktop
- Grille produits: 2 colonnes
- Padding: 24px
- Boutons: Auto width, centré
```

### Desktop (> 1024px)
```
- Font sizes: 100%
- Grille produits: 3-4 colonnes
- Padding: 32px
- Layouts: Multi-colonnes possibles
```

---

## 8. ACCESSIBILITÉ

### Contraste
```
Texte sur fond: Ratio 4.5:1 minimum (WCAG AA)
- Noir sur Blanc: ✅ 21:1
- Bleu sur Blanc: ✅ 8.6:1
- Gris sur Blanc: ✅ 5.5:1
```

### Focus States
```
- Outline: 2px solid #0066FF
- Offset: 2px
- Visible sur tous les boutons/champs au Tab
```

### Alt Text
```
Toutes les images/émojis importants ont du contexte
- Icônes: Décrire l'action
- Émojis: Contexte dans le texte
```

---

## 9. IMPLÉMENTATION CSS

### Variables CSS Recommandées
```css
:root {
  /* Couleurs */
  --color-primary: #0066FF;
  --color-primary-dark: #0052CC;
  --color-primary-light: #F0F4FF;
  --color-dark: #1A1A2E;
  --color-light: #F5F5F7;
  --color-success: #10B981;
  --color-warning: #FF8C42;
  --color-error: #EF4444;
  --color-text: #1A1A2E;
  --color-text-secondary: #6B7280;
  
  /* Typographie */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
  --font-secondary: 'Poppins', sans-serif;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --text-4xl: 4rem;
  
  /* Espacement */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  
  /* Transitions */
  --transition-fast: 0.15s ease-in-out;
  --transition-base: 0.3s ease;
  --transition-slow: 0.5s ease-in-out;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
}
```

---

## 10. EXEMPLE CODE (Bouton Principal)

```jsx
import styled from '@emotion/styled';

const PrimaryButton = styled.button`
  background-color: #0066FF;
  color: white;
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 102, 255, 0.3);
  
  &:hover {
    background-color: #0052CC;
    box-shadow: 0 8px 20px rgba(0, 102, 255, 0.4);
    transform: translateY(-2px);
  }
  
  &:active {
    background-color: #0040CC;
    transform: translateY(0);
  }
  
  &:focus {
    outline: 2px solid #0066FF;
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
```

---

## 11. CHECKLIST IMPLÉMENTATION

- [ ] Télécharger polices Inter & Poppins (Google Fonts)
- [ ] Créer fichier CSS/SCSS avec variables globales
- [ ] Remplacer toutes les couleurs hardcodées
- [ ] Appliquer styles boutons (Primary, Secondary, Danger)
- [ ] Appliquer styles cartes produits
- [ ] Implémenter animations (fade, slide, pulse)
- [ ] Tester responsivité (mobile, tablet, desktop)
- [ ] Vérifier contraste & accessibilité
- [ ] Tester sur vrais appareils
- [ ] Optimiser performances (images, CSS)

---

## 12. RESSOURCES GRATUITES

```
Polices: Google Fonts
- https://fonts.google.com/specimen/Inter
- https://fonts.google.com/specimen/Poppins

Icônes: Emoji (natif) + Heroicons (gratuit)
- https://heroicons.com

Générateur Ombre: Neumorphism.io
- https://neumorphism.io

Gradient Generator: Gradient.io
- https://gradient.io

Test Contraste: WebAIM
- https://webaim.org/resources/contrastchecker
```

---

**PRÊT À IMPLÉMENTER ?** 🚀
