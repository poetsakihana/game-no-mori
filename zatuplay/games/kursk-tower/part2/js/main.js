//=============================================================================
// main.js
//=============================================================================

PluginManager.setup($plugins);

window.onload = function() {
    if (!window.KurskSeries || !KurskSeries.requireEpisode(2)) return;
    SceneManager.run(Scene_Boot);
};
