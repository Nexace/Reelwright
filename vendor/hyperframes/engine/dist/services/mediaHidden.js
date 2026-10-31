import { HF_AUDIO_GROUP_ATTR, resolveAudioGroups } from "@hyperframes/core/audio-groups";
import { AUDIO_GROUP_RENDER_ID_ATTR } from "@hyperframes/core";
export function isSelfOrAncestorHidden(el) {
    for (let current = el; current; current = current.parentElement) {
        if (current.hasAttribute("data-hidden"))
            return true;
    }
    return false;
}
export function memberGroupKey(el) {
    return el.getAttribute(AUDIO_GROUP_RENDER_ID_ATTR) ?? el.getAttribute(HF_AUDIO_GROUP_ATTR);
}
export function audioGroupsById(document) {
    return new Map(resolveAudioGroups(document).map((group) => [group.id, group]));
}
export function isMemberGroupHidden(groupsById, el) {
    const groupId = memberGroupKey(el);
    return groupId ? (groupsById.get(groupId)?.hidden ?? false) : false;
}
