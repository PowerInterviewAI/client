/**
 * Shared geometry and resting states for the control bar.
 *
 * Every control on the row is 32px tall with one radius. Each group used to size its own buttons,
 * and they had drifted to three heights and two radii - which is what made the row read as a set
 * of unrelated widgets sharing a line rather than as one toolbar.
 */
export const BAR_ICON_BUTTON = 'h-8 w-8 rounded-lg';

/**
 * Resting state for everything except the primary action: quiet until pointed at.
 *
 * The bar used to be filled `secondary` throughout, which spent the row's whole contrast budget on
 * controls that are idle most of the time and left nothing for the one that matters.
 */
export const BAR_GHOST = 'text-muted-foreground hover:text-foreground hover:bg-muted';

/**
 * A toggle that is on.
 *
 * The ghost resting state above is what makes this legible. A tint against the filled `secondary`
 * these buttons used to sit on read as nearly invisible, which is why the toggles signalled state
 * by swapping their icon instead. They still swap the icon - it survives a colour-blind reader and
 * a screenshot - but the fill is now what carries it at a glance.
 */
export const BAR_ACTIVE = 'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary';
