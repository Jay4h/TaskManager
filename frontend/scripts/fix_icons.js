const fs = require('fs');

function fixIcons(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // the previous script resulted in <i className="..." /></i>
    // we just need to replace /></i> with  />
    content = content.replace(/\/><\/i>/g, ' />');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed icons in ${filePath}`);
}

fixIcons('f:/rough/Tasks/TaskManager/frontend/app/components/videocalls/ChannelVideoCall.tsx');
fixIcons('f:/rough/Tasks/TaskManager/frontend/app/components/videocalls/ChannelVoiceCall.tsx');
