const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/styles.css', 'utf8');
const dataJs = fs.readFileSync('js/data.js', 'utf8');
const stateJs = fs.readFileSync('js/state.js', 'utf8');
const compJs = fs.readFileSync('js/components.js', 'utf8');
const appJs = fs.readFileSync('js/app.js', 'utf8');

// Replace CSS link with inline style
html = html.replace(
  '<link rel="stylesheet" href="css/styles.css">',
  `<style>\n${css}\n</style>`
);

// Replace external JS script tags with inline scripts
const scriptTags = `<script src="js/data.js"></script>
  <script src="js/state.js"></script>
  <script src="js/components.js"></script>
  <script src="js/app.js"></script>`;

const inlineScripts = `<script>
${dataJs}

${stateJs}

${compJs}

${appJs}
</script>`;

html = html.replace(scriptTags, inlineScripts);

fs.writeFileSync('GSCSCL_Standalone.html', html, 'utf8');
console.log('Successfully generated GSCSCL_Standalone.html (' + Math.round(fs.statSync('GSCSCL_Standalone.html').size / 1024) + ' KB)');
