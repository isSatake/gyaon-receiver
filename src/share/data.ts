export type Sound = {
    url: string,
    title: string,
    keyboard: string
}

export type PageData = {
    title: string,
    sounds: Sound[]
}

export type ScrapBoxPageLine = {
    id: string,
    text: string,
    userId: string,
    created: number,
    updated: number
}