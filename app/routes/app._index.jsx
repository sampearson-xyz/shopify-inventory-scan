import { useState } from "react";







import { useFetcher } from "react-router";







import { authenticate } from "../shopify.server";







import { analyseCard } from "../card-analysis.server";







export const loader = async ({ request }) => {







  await authenticate.admin(request);







  return null;







};







export const action = async ({ request }) => {







  const { admin } = await authenticate.admin(request);







  try {







    const formData = await request.formData();







    const intent = formData.get("intent");







    if (intent === "analyse") {







      const frontImage = formData.get("frontImage");







      const backImage = formData.get("backImage");



      if (!frontImage || frontImage.size === 0) {



        return {



          success: false,



          intent: "analyse",



          error: "Please upload a front image.",



        };



      }







      const analysis = await analyseCard(



        frontImage,



        backImage?.size ? backImage : null,



      );







      return {







        success: true,







        intent: "analyse",







        analysis,







      };







    }







    if (intent === "create") {







      const title = clean(formData.get("title"));







      const description = clean(formData.get("description"));







      const price = clean(formData.get("price"));







      const condition = clean(formData.get("condition"));







      const certificationNumber = clean(







        formData.get("certificationNumber"),







      );







      const grade = clean(formData.get("grade"));







      const gradingCompany = clean(







        formData.get("gradingCompany"),







      );







      const cardNumber = clean(formData.get("cardNumber"));







      const parallel = clean(formData.get("parallel"));







      const set = clean(formData.get("set"));







      const year = clean(formData.get("year"));







      const serialNumber = clean(







        formData.get("serialNumber"),







      );







      const printRun = clean(formData.get("printRun"));







      const graded =







        clean(formData.get("graded")) === "true";







      const frontImage = formData.get("frontImage");







      const backImage = formData.get("backImage");







      if (!title) {







        return createError("Product title is required.");







      }







      if (!price) {







        return createError("Please enter a price.");







      }







      const numericPrice = Number(price);







      if (







        !Number.isFinite(numericPrice) ||







        numericPrice < 0







      ) {







        return createError(







          "Please enter a valid price.",







        );







      }







      const metafields = [];







      addTextMetafield(







        metafields,







        "condition",







        condition,







      );







      addTextMetafield(







        metafields,







        "certification_number",







        certificationNumber,







      );







      addTextMetafield(







        metafields,







        "grade",







        grade,







      );







      addTextMetafield(







        metafields,







        "grading_company",







        gradingCompany,







      );







      addTextMetafield(







        metafields,







        "card_number",







        cardNumber,







      );







      addTextMetafield(







        metafields,







        "parallel",







        parallel,







      );







      addTextMetafield(







        metafields,







        "set",







        set,







      );







      addTextMetafield(







        metafields,







        "year",







        year,







      );







      addIntegerMetafield(







        metafields,







        "serial_number",







        serialNumber,







      );







      addIntegerMetafield(







        metafields,







        "print_run",







        printRun,







      );







      const createResponse = await admin.graphql(







        `#graphql







          mutation CreateCardProduct(







            $product: ProductCreateInput!







          ) {







            productCreate(product: $product) {







              product {







                id







                title







                handle







                status







                variants(first: 1) {







                  nodes {







                    id







                    price







                    inventoryItem {







                      id







                    }







                  }







                }







              }







              userErrors {







                field







                message







              }







            }







          }







        `,







        {







          variables: {







            product: {







              title,







              descriptionHtml:







                descriptionToHtml(description),







              vendor: "Gengar's Vault",







              status: "ACTIVE",







              metafields,







            },







          },







        },







      );







      const createData =







        await createResponse.json();







      if (createData.errors?.length) {







        return createError(







          createData.errors







            .map((error) => error.message)







            .join(", "),







        );







      }







      const createPayload =







        createData.data?.productCreate;







      if (createPayload?.userErrors?.length) {







        return createError(







          createPayload.userErrors







            .map((error) => error.message)







            .join(", "),







        );







      }







      const product = createPayload?.product;







      if (!product) {







        return createError(







          "Shopify did not return the created product.",







        );







      }







      const variant =







        product.variants?.nodes?.[0];







      if (!variant) {







        return createError(







          "Shopify did not return the default variant.",







        );







      }







      const inventoryItemId =







        variant.inventoryItem?.id;







      if (!inventoryItemId) {







        return createError(







          "Shopify did not return an inventory item.",







        );







      }







      const variantResponse =







        await admin.graphql(







          `#graphql







            mutation UpdateCardVariant(







              $productId: ID!







              $variants: [ProductVariantsBulkInput!]!







            ) {







              productVariantsBulkUpdate(







                productId: $productId







                variants: $variants







              ) {







                productVariants {







                  id







                  price







                }







                userErrors {







                  field







                  message







                }







              }







            }







          `,







          {







            variables: {







              productId: product.id,







              variants: [







                {







                  id: variant.id,







                  price:







                    numericPrice.toFixed(2),







                },







              ],







            },







          },







        );







      const variantData =







        await variantResponse.json();







      if (variantData.errors?.length) {







        return createError(







          "Product created, but price failed: " +







            variantData.errors







              .map((error) => error.message)







              .join(", "),







        );







      }







      const variantErrors =







        variantData.data







          ?.productVariantsBulkUpdate







          ?.userErrors || [];







      if (variantErrors.length) {







        return createError(







          "Product created, but price failed: " +







            variantErrors







              .map((error) => error.message)







              .join(", "),







        );







      }







      const packageData = graded







        ? {







            weight: 50,







            length: 18,







            width: 10,







            height: 3,







          }







        : {







            weight: 10,







            length: 15,







            width: 6,







            height: 1,







          };







      const inventoryResponse =







        await admin.graphql(







          `#graphql







            mutation UpdateInventoryItem(







              $id: ID!







              $input: InventoryItemInput!







            ) {







              inventoryItemUpdate(







                id: $id







                input: $input







              ) {







                inventoryItem {







                  id







                  tracked







                  requiresShipping







                  measurement {







                    weight {







                      value







                      unit







                    }







                    packedDimensions {







                      length







                      width







                      height







                      unit







                    }







                  }







                }







                userErrors {







                  field







                  message







                }







              }







            }







          `,







          {







            variables: {







              id: inventoryItemId,







              input: {







                tracked: true,







                requiresShipping: true,







                measurement: {







                  weight: {







                    value: packageData.weight,







                    unit: "GRAMS",







                  },







                  packedDimensions: {







                    length:







                      packageData.length,







                    width:







                      packageData.width,







                    height:







                      packageData.height,







                    unit: "CENTIMETERS",







                  },







                },







              },







            },







          },







        );







      const inventoryData =







        await inventoryResponse.json();







      if (inventoryData.errors?.length) {







        return createError(







          "Product created, but package measurements failed: " +







            inventoryData.errors







              .map((error) => error.message)







              .join(", "),







        );







      }







      const inventoryErrors =







        inventoryData.data







          ?.inventoryItemUpdate







          ?.userErrors || [];







      if (inventoryErrors.length) {







        return createError(







          "Product created, but package measurements failed: " +







            inventoryErrors







              .map((error) => error.message)







              .join(", "),







        );







      }







      const locationResponse =







        await admin.graphql(







          `#graphql







            query CardInventoryLocation {







              locations(first: 1) {







                nodes {







                  id







                  name







                }







              }







            }







          `,







        );







      const locationData =







        await locationResponse.json();







      const location =







        locationData.data?.locations?.nodes?.[0];







      if (!location) {







        return createError(







          "Product created, but no active Shopify inventory location was found.",







        );







      }







      const activateResponse =

  await admin.graphql(

    `#graphql

      mutation SetCardInventory(

        $input: InventorySetQuantitiesInput!

        $idempotencyKey: String!

      ) {

        inventorySetQuantities(

          input: $input

        ) @idempotent(key: $idempotencyKey) {

          inventoryAdjustmentGroup {

            reason

            changes {

              name

              delta

              quantityAfterChange

            }

          }

          userErrors {

            code

            field

            message

          }

        }

      }

    `,

    {

      variables: {

        input: {

          name: "available",

          reason: "correction",

          referenceDocumentUri: `gid://inventory-card-scan/product/${product.id.split("/").pop()}`,

          quantities: [

            {

              inventoryItemId,

              locationId: location.id,

              quantity: 1,

              changeFromQuantity: null,

            },

          ],

        },

        idempotencyKey: crypto.randomUUID(),

      },

    },

  );



      const activateData =







        await activateResponse.json();







      if (activateData.errors?.length) {







        return createError(







          "Product created, but inventory quantity failed: " +







            activateData.errors







              .map((error) => error.message)







              .join(", "),







        );







      }







      const activateErrors =







        activateData.data?.inventoryActivate







          ?.userErrors || [];







      if (activateErrors.length) {







        return createError(







          "Product created, but inventory quantity failed: " +







            activateErrors







              .map((error) => error.message)







              .join(", "),







        );







      }







      const images = [







        frontImage?.size







          ? {







              file: frontImage,







              alt: `${title} - Front`,







            }







          : null,







        backImage?.size







          ? {







              file: backImage,







              alt: `${title} - Back`,







            }







          : null,







      ].filter(Boolean);







      if (images.length) {







        const stagedResponse =







          await admin.graphql(







            `#graphql







              mutation CreateImageUploads(







                $input: [StagedUploadInput!]!







              ) {







                stagedUploadsCreate(







                  input: $input







                ) {







                  stagedTargets {







                    url







                    resourceUrl







                    parameters {







                      name







                      value







                    }







                  }







                  userErrors {







                    field







                    message







                  }







                }







              }







            `,







            {







              variables: {







                input: images.map(







                  ({ file }) => ({







                    filename:







                      file.name ||







                      `card-${crypto.randomUUID()}.jpg`,







                    mimeType:







                      file.type ||







                      "image/jpeg",







                    resource:







                      "PRODUCT_IMAGE",







                    httpMethod: "POST",







                  }),







                ),







              },







            },







          );







        const stagedData =







          await stagedResponse.json();







        if (stagedData.errors?.length) {







          return createError(







            "Product created, but image preparation failed: " +







              stagedData.errors







                .map(







                  (error) =>







                    error.message,







                )







                .join(", "),







          );







        }







        const stagedErrors =







          stagedData.data







            ?.stagedUploadsCreate







            ?.userErrors || [];







        if (stagedErrors.length) {







          return createError(







            "Product created, but image preparation failed: " +







              stagedErrors







                .map(







                  (error) =>







                    error.message,







                )







                .join(", "),







          );







        }







        const targets =







          stagedData.data







            ?.stagedUploadsCreate







            ?.stagedTargets || [];







        if (







          targets.length !== images.length







        ) {







          return createError(







            "Product created, but Shopify did not return all image upload targets.",







          );







        }







        for (







          let index = 0;







          index < images.length;







          index++







        ) {







          const image = images[index];







          const target = targets[index];







          const uploadForm =







            new FormData();







          for (const parameter of







            target.parameters) {







            uploadForm.append(







              parameter.name,







              parameter.value,







            );







          }







          uploadForm.append(







            "file",







            image.file,







            image.file.name,







          );







          const uploadResponse =







            await fetch(target.url, {







              method: "POST",







              body: uploadForm,







            });







          if (!uploadResponse.ok) {







            return createError(







              `Product created, but ${







                index === 0







                  ? "front"







                  : "back"







              } image upload failed.`,







            );







          }







        }







        const mediaResponse =







          await admin.graphql(







            `#graphql







              mutation AttachCardImages(







                $product: ProductUpdateInput!







                $media: [CreateMediaInput!]







              ) {







                productUpdate(







                  product: $product







                  media: $media







                ) {







                  product {







                    id







                    media(first: 10) {







                      nodes {







                        id







                        alt







                        mediaContentType







                        preview {







                          status







                        }







                      }







                    }







                  }







                  userErrors {







                    field







                    message







                  }







                }







              }







            `,







            {







              variables: {







                product: {







                  id: product.id,







                },







                media: images.map(







                  (image, index) => ({







                    originalSource:







                      targets[index]







                        .resourceUrl,







                    mediaContentType:







                      "IMAGE",







                    alt: image.alt,







                  }),







                ),







              },







            },







          );







        const mediaData =







          await mediaResponse.json();







        if (mediaData.errors?.length) {







          return createError(







            "Product created, but attaching images failed: " +







              mediaData.errors







                .map(







                  (error) =>







                    error.message,







                )







                .join(", "),







          );







        }







        const mediaErrors =







          mediaData.data?.productUpdate







            ?.userErrors || [];







        if (mediaErrors.length) {







          return createError(







            "Product created, but attaching images failed: " +







              mediaErrors







                .map(







                  (error) =>







                    error.message,







                )







                .join(", "),







          );







        }







      }







      const publicationsResponse =







        await admin.graphql(







          `#graphql







            query CardPublications {







              publications(first: 50) {







                nodes {







                  id







                  name







                  autoPublish







                }







              }







            }







          `,







        );







      const publicationsData =







        await publicationsResponse.json();







      const publications =







        publicationsData.data







          ?.publications?.nodes || [];







      const onlineStore =







        publications.find(







          (publication) =>







            publication.name







              ?.toLowerCase()







              .includes("online store"),







        );







      if (onlineStore) {







        const publishResponse =







          await admin.graphql(







            `#graphql







              mutation PublishCard(







                $id: ID!







                $input: [PublicationInput!]!







              ) {







                publishablePublish(







                  id: $id







                  input: $input







                ) {







                  publishable {







                    availablePublicationsCount {







                      count







                    }







                  }







                  userErrors {







                    field







                    message







                  }







                }







              }







            `,







            {







              variables: {







                id: product.id,







                input: [







                  {







                    publicationId:







                      onlineStore.id,







                  },







                ],







              },







            },







          );







        const publishData =







          await publishResponse.json();







        if (publishData.errors?.length) {







          return createError(







            "Product created, but Online Store publication failed: " +







              publishData.errors







                .map(







                  (error) =>







                    error.message,







                )







                .join(", "),







          );







        }







        const publishErrors =







          publishData.data







            ?.publishablePublish







            ?.userErrors || [];







        if (publishErrors.length) {







          return createError(







            "Product created, but Online Store publication failed: " +







              publishErrors







                .map(







                  (error) =>







                    error.message,







                )







                .join(", "),







          );







        }







      }







      return {







        success: true,







        intent: "create",







        product: {







          id: product.id,







          title: product.title,







          handle: product.handle,







          status: product.status,







          price:







            numericPrice.toFixed(2),







          location:







            location.name,







          published:







            Boolean(onlineStore),







          package: packageData,







          imageCount:







            images.length,







        },







      };







    }







    return {







      success: false,







      error: "Unknown action.",







    };







  } catch (error) {







    console.error(







      "Inventory Card Scan error:",







      error,







    );







    return {







      success: false,







      error:







        error?.message ||







        "Something went wrong.",







    };







  }







};







function createError(message) {







  return {







    success: false,







    intent: "create",







    error: message,







  };







}







function clean(value) {







  if (







    value === null ||







    value === undefined







  ) {







    return "";







  }







  return String(value).trim();







}







function addTextMetafield(







metafields,







key,







value,







) {







  if (!value) return;







  metafields.push({







    namespace: "custom",







    key,







    type: "single_line_text_field",







    value,







  });







}







function addIntegerMetafield(







metafields,







key,







value,







) {







  if (!value) return;







  const number =







    Number.parseInt(value, 10);







  if (!Number.isInteger(number)) {







    return;







  }







metafields.push({







    namespace: "custom",







    key,







    type: "number_integer",







    value: String(number),







  });







}







function descriptionToHtml(value) {







  if (!value) return "";







  return value







    .split(/\n{2,}/)







    .map((paragraph) => {







      const escaped =







        escapeHtml(paragraph).replace(







          /\n/g,







          "<br>",







        );







      return `<p>${escaped}</p>`;







    })







    .join("");







}







function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}





export default function Index() {







  const fetcher = useFetcher();







  const [







    frontImage,







setFrontImage,







  ] = useState(null);







  const [







    backImage,







setBackImage,







  ] = useState(null);







  const [







    frontPreview,







setFrontPreview,







  ] = useState(null);







  const [







    backPreview,







setBackPreview,







  ] = useState(null);







  const isAnalysing =







    fetcher.state !== "idle";







  const result = fetcher.data;







  const handleImage = async (event, side) => {



    const originalFile = event.target.files?.[0];







    if (!originalFile) return;







    try {



      let file = originalFile;



      const filename = originalFile.name.toLowerCase();



      const isHeic =



        originalFile.type === "image/heic" ||



        originalFile.type === "image/heif" ||



        filename.endsWith(".heic") ||



        filename.endsWith(".heif");







      if (isHeic) {

        const { heicTo } = await import("heic-to");



        const jpegBlob = await heicTo({

          blob: originalFile,

          type: "image/jpeg",

          quality: 0.92,

        });



        const jpegName = originalFile.name.replace(/\.(heic|heif)$/i, ".jpg");







        file = new File([jpegBlob], jpegName, {



          type: "image/jpeg",



          lastModified: Date.now(),



        });



      }







      const preview = URL.createObjectURL(file);







      if (side === "front") {



        setFrontImage(file);



        setFrontPreview(preview);



      } else {



        setBackImage(file);



        setBackPreview(preview);



      }



    } catch (error) {



      console.error("Image conversion failed:", error);



      alert("That image could not be converted. Please try another image.");



    }



  };







  const analyse = () => {







    const formData =







      new FormData();







    formData.append(







      "intent",







      "analyse",







    );







    if (frontImage) {







      formData.append(







        "frontImage",







        frontImage,







      );







    }







    if (backImage) {







      formData.append(







        "backImage",







        backImage,







      );







    }







    fetcher.submit(formData, {







      method: "post",







      encType:







        "multipart/form-data",







    });







  };







  return (







    <s-page heading="Inventory Card Scan">







      <s-section heading="Add a card">







        <s-paragraph>







          Upload photographs of the







          card and Gengar's Vault







          will analyse them and prepare







          the Shopify product







          information.







        </s-paragraph>







        <div







style={{







            display: "grid",







            gridTemplateColumns:







              "repeat(auto-fit, minmax(280px, 1fr))",







            gap: "20px",







            marginTop: "20px",







          }}







        >







          <ImageUploader







title="Front image — required"







preview={frontPreview}







onChange={(event) =>







              handleImage(







                event,







                "front",







              )







            }







          />







          <ImageUploader







title="Back image — optional"







preview={backPreview}







onChange={(event) =>







              handleImage(







                event,







                "back",







              )







            }







          />







        </div>







        <div







style={{







            marginTop: "24px",







          }}







        >







          <s-button







variant="primary"







disabled={!frontImage || isAnalysing}







loading={isAnalysing}







onClick={analyse}







          >







            {isAnalysing







              ? "Analysing card..."







              : "Analyse card"}







          </s-button>







        </div>







        {result?.error && (







          <div







style={{







              marginTop: "20px",







            }}







          >







            <s-banner tone="critical">







              {result.error}







            </s-banner>







          </div>







        )}







      </s-section>







      {result?.success &&







        result.intent ===







          "analyse" &&







        result.analysis && (







          <AnalysisResult







analysis={







              result.analysis







            }







frontImage={







              frontImage







            }







backImage={







              backImage







            }







          />







        )}







    </s-page>







  );







}







function AnalysisResult({







analysis,







frontImage,







backImage,







}) {







  const createFetcher =







    useFetcher();







  const [form, setForm] =







    useState({







      title:







        analysis.title || "",







      description:







        analysis.description || "",







      condition:







        analysis.graded







          ? "Graded"







          : "Raw",







      certificationNumber:







        analysis.certificationNumber ||







        "",







      grade:







        analysis.grade || "",







      gradingCompany:







        analysis.gradingCompany ||







        "",







      cardNumber:







analysis.cardNumber || "",







      parallel:







analysis.parallel || "",







      set:







analysis.set || "",







      year:







analysis.year || "",







      serialNumber:







analysis.serialNumber ?? "",







      printRun:







analysis.printRun ?? "",







      price: "",







    });







    const confidence = Math.round(



        (analysis.confidence || 0) * 100,



      );







  const isCreating =







    createFetcher.state !==







    "idle";







  const result =







    createFetcher.data;







  const update = (







field,







value,







  ) => {







    setForm((current) => ({







      ...current,







      [field]: value,







    }));







  };







  const createProduct = () => {







    const formData =







      new FormData();







    formData.append(







      "intent",







      "create",







    );







    formData.append(







      "graded",







analysis.graded







        ? "true"







        : "false",







    );







    Object.entries(form).forEach(







      ([key, value]) => {







        formData.append(







          key,







          String(value ?? ""),







        );







      },







    );







    if (frontImage) {







      formData.append(







        "frontImage",







        frontImage,







      );







    }







    if (backImage) {







      formData.append(







        "backImage",







        backImage,







      );







    }







    createFetcher.submit(







      formData,







      {







        method: "post",







        encType:







          "multipart/form-data",







      },







    );







  };







  return (







    <s-section heading="Review card">







      <div







style={{







          marginBottom: "20px",







        }}







      >







        <strong>







          AI confidence:{" "}







          {confidence}%







        </strong>







      </div>







      {analysis.warnings







        ?.length > 0 && (







        <div







style={{







            marginBottom: "20px",







          }}







        >







          <s-banner tone="warning">







            {analysis.warnings.join(







              " • ",







            )}







          </s-banner>







        </div>







      )}







      <div







style={{







          display: "grid",







          gridTemplateColumns:







            "repeat(auto-fit, minmax(220px, 1fr))",







          gap: "16px",







          marginBottom: "28px",







        }}







      >







        <EditableField







label="Set"







value={form.set}







onChange={(value) =>







            update(







              "set",







              value,







            )







          }







        />







        <EditableField







label="Year"







value={form.year}







onChange={(value) =>







            update(







              "year",







              value,







            )







          }







        />







        <EditableField







label="Card number"







value={







            form.cardNumber







          }







onChange={(value) =>







            update(







              "cardNumber",







              value,







            )







          }







        />







        <EditableField







label="Parallel"







value={form.parallel}







onChange={(value) =>







            update(







              "parallel",







              value,







            )







          }







        />







        <EditableField







label="Serial number"







type="number"







value={







            form.serialNumber







          }







onChange={(value) =>







            update(







              "serialNumber",







              value,







            )







          }







        />







        <EditableField







label="Print run"







type="number"







value={form.printRun}







onChange={(value) =>







            update(







              "printRun",







              value,







            )







          }







        />







        <EditableField







label="Condition"







value={







            form.condition







          }







onChange={(value) =>







            update(







              "condition",







              value,







            )







          }







        />







        <EditableField







label="Grading company"







value={







            form.gradingCompany







          }







onChange={(value) =>







            update(







              "gradingCompany",







              value,







            )







          }







        />







        <EditableField







label="Grade"







value={form.grade}







onChange={(value) =>







            update(







              "grade",







              value,







            )







          }







        />







        <EditableField







label="Certification number"







value={







            form.certificationNumber







          }







onChange={(value) =>







            update(







              "certificationNumber",







              value,







            )







          }







        />







      </div>







      <div







style={{







          marginBottom: "20px",







        }}







      >







        <label







style={{







            display: "block",







            fontWeight: 600,







            marginBottom: "6px",







          }}







        >







          Product title







        </label>







        <input







value={form.title}







onChange={(event) =>







            update(







              "title",







              event.target.value,







            )







          }







style={{







            width: "100%",







            boxSizing:







              "border-box",







            padding: "10px",







          }}







        />







      </div>







      <div







style={{







          marginBottom: "20px",







        }}







      >







        <label







style={{







            display: "block",







            fontWeight: 600,







            marginBottom: "6px",







          }}







        >







          Description







        </label>







        <textarea







value={







            form.description







          }







onChange={(event) =>







            update(







              "description",







              event.target.value,







            )







          }







rows={10}







style={{







            width: "100%",







            boxSizing:







              "border-box",







            padding: "10px",







            resize: "vertical",







          }}







        />







      </div>







      <div







style={{







          maxWidth: "220px",







          marginBottom: "24px",







        }}







      >







        <EditableField







label="Price (£)"







type="number"







step="0.01"







value={form.price}







onChange={(value) =>







            update(







              "price",







              value,







            )







          }







        />







      </div>







      <div







style={{







          marginBottom: "24px",







          padding: "14px",







          background: "#f6f6f7",







          borderRadius: "8px",







        }}







      >







        <strong>







          Shipping defaults







        </strong>







        <div







style={{







            marginTop: "6px",







          }}







        >







          {analysis.graded







            ? "Graded slab — 18 × 10 × 3 cm — 50 g"







            : "Raw card — 15 × 6 × 1 cm — 10 g"}







        </div>







        <div







style={{







            marginTop: "4px",







          }}







        >







          Inventory: 1







        </div>







        <div







style={{







            marginTop: "4px",







          }}







        >







          Status: Active +







          Online Store







        </div>







      </div>







      {result?.error && (







        <div







style={{







            marginBottom: "20px",







          }}







        >







          <s-banner tone="critical">







            {result.error}







          </s-banner>







        </div>







      )}







      {result?.success &&







        result.product && (







          <div







style={{







              marginBottom: "20px",







            }}







          >







            <s-banner tone="success">







              {result.product.title}{" "}







              created successfully at







              £







              {







                result.product







                  .price







              }







              . Stock: 1. Images:{" "}







              {







                result.product







                  .imageCount







              }







              . Package:{" "}







              {







                result.product







                  .package.length







              }{" "}







              ×{" "}







              {







                result.product







                  .package.width







              }{" "}







              ×{" "}







              {







                result.product







                  .package.height







              }{" "}







              cm /{" "}







              {







                result.product







                  .package.weight







              }{" "}







              g.







            </s-banner>







          </div>







        )}







      <s-button







variant="primary"







disabled={







          !form.title ||







          !form.price ||







          isCreating ||







          result?.success







        }







loading={isCreating}







onClick={







          createProduct







        }







      >







        {isCreating







          ? "Creating product..."







          : result?.success







            ? "Product created"







            : "Create product"}







      </s-button>







    </s-section>







  );







}







function EditableField({







label,







value,







onChange,







type = "text",







step,







}) {







  return (







    <div>







      <label







style={{







          display: "block",







          fontWeight: 600,







          marginBottom: "6px",







        }}







      >







        {label}







      </label>







      <input







type={type}







step={step}







value={value}







onChange={(event) =>







          onChange(







            event.target.value,







          )







        }







style={{







          width: "100%",







          boxSizing:







            "border-box",







          padding: "10px",







        }}







      />







    </div>







  );







}







function ImageUploader({







title,







preview,







onChange,







}) {







  return (







    <div>







      <div







style={{







          fontWeight: 600,







          marginBottom: "8px",







        }}







      >







        {title}







      </div>







      <label







style={{







          display: "flex",







          minHeight: "360px",







          border:







            "2px dashed #c9cccf",







          borderRadius: "12px",







          alignItems: "center",







          justifyContent:







            "center",







          cursor: "pointer",







          overflow: "hidden",







          background: "#fafbfb",







          position: "relative",







        }}







      >







        {preview ? (







          <img







src={preview}







alt={`${title} preview`}







style={{







              width: "100%",







              height: "360px",







              objectFit:







                "contain",







            }}







          />







        ) : (







          <div







style={{







              textAlign:







                "center",







              padding: "30px",







            }}







          >







            <div







style={{







                fontSize: "38px",







                marginBottom:







                  "10px",







              }}







            >







              ＋







            </div>







            <strong>







              Choose image







            </strong>







            <div







style={{







                marginTop: "6px",







                color: "#616161",







              }}







            >







              JPG, PNG, WEBP or HEIC







            </div>







          </div>







        )}







        <input







type="file"







accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"



onChange={onChange}







style={{







            position: "absolute",







            width: "1px",







            height: "1px",







            opacity: 0,







          }}







        />







      </label>







      {preview && (







        <div







style={{







            marginTop: "8px",







          }}







        >







          <s-text tone="success">







            Image ready







          </s-text>







        </div>







      )}







    </div>







  );







}