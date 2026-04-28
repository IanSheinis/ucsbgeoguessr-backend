import {ImageConfig} from "../../backend/helpers/types"
/**
 * When adding an image add it to the config for this
 * Used this website to get lat and long https://www.gps-coordinates.net/
 *
 * If changing metadata configuration here change it in backend/imgBucket/init also
 * DO NOT ADD IMAGES CAN NOT BE OVER 5MB, compress them if you have to
 */


export const imgConfig: ImageConfig[] = [
  {
    imgName: "Kohn_Hall.jpg",
    Location: "In front of Kohn Hall on sidewalk",
    Latitude: "34.41395214271208",
    Longitude: "-119.84051613248955",
    Categories: '[]'
  },
]