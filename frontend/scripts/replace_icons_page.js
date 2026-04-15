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
        'VideoCameraSlashIcon': 'pi pi-video',
        'MicrophoneIcon': 'pi pi-microphone',
        'ChatBubbleLeftEllipsisIcon': 'pi pi-comments',
        'ComputerDesktopIcon': 'pi pi-desktop',
        'PhoneIcon': 'pi pi-phone',
        'XMarkIcon': 'pi pi-times',
        'Cog6ToothIcon': 'pi pi-cog',
        'HashtagIcon': 'pi pi-hashtag',
        'UserGroupIcon': 'pi pi-users',
        'PaperAirplaneIcon': 'pi pi-send',
        'EllipsisVerticalIcon': 'pi pi-ellipsis-v',
        'CheckIcon': 'pi pi-check',
        'FaceSmileIcon': 'pi pi-face-smile',
        'PlusCircleIcon': 'pi pi-plus-circle',
        'MicrophoneIcon': 'pi pi-microphone',
        'SpeakerWaveIcon': 'pi pi-volume-up',
        'PhoneArrowDownLeftIcon': 'pi pi-phone',
        'DocumentPlusIcon': 'pi pi-file-plus'
    };

    for (const [icon, piIcon] of Object.entries(replacements)) {
        const regex = new RegExp(`<${icon}([^>]*)>`, 'g');
        content = content.replace(regex, (match, attrs) => {
            if (attrs.includes('className=')) {
                return `<i${attrs.replace(/className=(['"])/, `className=$1${piIcon} text-[18px] `)}></i>`;
            }
            return `<i className="${piIcon} text-[18px]"${attrs}></i>`;
        });
    }
    
    // fix closing div syntax for previous tool
    content = content.replace(/\/><\/i>/g, '></i>');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Replaced icons in ${filePath}`);
}

replaceIcons('f:/rough/Tasks/TaskManager/frontend/app/dashboard/channels/[id]/page.tsx');
