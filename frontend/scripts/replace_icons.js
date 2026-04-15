const fs = require('fs');

function replaceIcons(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove heroicon imports
    content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]@heroicons\/react\/[0-9]+\/outline['"];/g, '');

    // Replace usages
    const replacements = {
        'ChevronDownIcon': 'pi pi-chevron-down',
        'ArrowsPointingOutIcon': 'pi pi-window-maximize',
        'ArrowsPointingInIcon': 'pi pi-window-minimize',
        'SpeakerWaveIcon': 'pi pi-volume-up',
        'UserPlusIcon': 'pi pi-user-plus',
        'VideoCameraIcon': 'pi pi-video',
        'VideoCameraSlashIcon': 'pi pi-video', // prime doesn't have a video slash, usually
        'MicrophoneIcon': 'pi pi-microphone',
        'ChatBubbleLeftEllipsisIcon': 'pi pi-comments',
        'ComputerDesktopIcon': 'pi pi-desktop',
        'PhoneIcon': 'pi pi-phone',
        'XMarkIcon': 'pi pi-times',
        'Cog6ToothIcon': 'pi pi-cog'
    };

    for (const [icon, piIcon] of Object.entries(replacements)) {
        // e.g. <MicrophoneIcon className="w-5 h-5 />
        const regex = new RegExp(`<${icon}([^>]*)>`, 'g');
        content = content.replace(regex, (match, attrs) => {
            // If classname exists, inject our icons into it
            if (attrs.includes('className=')) {
                return `<i${attrs.replace(/className=(['"])/, `className=$1${piIcon} text-[18px] `)}></i>`;
            }
            return `<i className="${piIcon} text-[18px]"${attrs}></i>`;
        });
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Replaced icons in ${filePath}`);
}

replaceIcons('f:/rough/Tasks/TaskManager/frontend/app/components/videocalls/ChannelVideoCall.tsx');
replaceIcons('f:/rough/Tasks/TaskManager/frontend/app/components/videocalls/ChannelVoiceCall.tsx');
